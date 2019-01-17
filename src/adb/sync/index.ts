import { createReadStream, PathLike, write } from 'fs';
import { basename } from 'path';
import { EventEmitter } from 'events';
import debugFunc from 'debug';
const debug = debugFunc('adb:sync');

import { FailError } from '../parser';
import Protocol from '../protocol';
import Stats from './stats';
import Entry from './entry';
import PushTransfer from './pushtransfer';
import PullTransfer from './pulltransfer';
import { Readable } from 'stream';
import { CancellationError } from '../tracker';
import Connection from '../connection';

const TEMP_PATH = '/data/local/tmp';
const DEFAULT_CHMOD = 0o644;
const DATA_MAX_LENGTH = 65536;

export default class Sync extends EventEmitter {
    static temp(path: string) {
        return `${TEMP_PATH}/${basename(path)}`;
    }

    parser = this.connection.parser!;

    constructor(public connection: Connection) {
        super();
    }

    async stat(path: string) {
        this._sendCommandWithArg(Protocol.STAT, path);
        const reply = await this.parser.readAscii(4);
        switch (reply) {
            case Protocol.STAT:
                const stat = await this.parser.readBytes(12);
                const mode = stat.readUInt32LE(0);
                const size = stat.readUInt32LE(4);
                const mtime = stat.readUInt32LE(8);
                if (mode === 0) {
                    throw new EnoentError(path);
                } else {
                    return new Stats(mode, size, mtime);
                }
            case Protocol.FAIL:
                return this._readError();
            default:
                return this.parser.unexpected(reply, 'STAT or FAIL');
        }
    }

    readdir(path: string) {
        const files: Entry[] = [];

        const readNext = async (): Promise<Entry[]> => {
            const reply = await this.parser.readAscii(4);
            switch (reply) {
                case Protocol.DENT:
                    const stat = await this.parser.readBytes(16);
                    const mode = stat.readUInt32LE(0);
                    const size = stat.readUInt32LE(4);
                    const mtime = stat.readUInt32LE(8);
                    const namelen = stat.readUInt32LE(12);
                    const nameBuffer = await this.parser.readBytes(namelen);
                    const name = nameBuffer.toString();
                    // Skip '.' and '..' to match Node's fs.readdir().
                    if (name !== '.' && name !== '..') {
                        files.push(new Entry(name, mode, size, mtime));
                    }
                    return readNext();
                case Protocol.DONE:
                    await this.parser.readBytes(16);
                    return files;
                case Protocol.FAIL:
                    return this._readError();
                default:
                    return this.parser.unexpected(reply, 'DENT, DONE or FAIL');
            }
        };

        this._sendCommandWithArg(Protocol.LIST, path);

        return readNext();
    }

    push(contents: string | Readable, path: string, mode?: number) {
        if (typeof contents === 'string') {
            return this.pushFile(contents, path, mode);
        } else {
            return this.pushStream(contents, path, mode);
        }
    }

    pushFile(file: PathLike, path: string, mode = DEFAULT_CHMOD) {
        if (!mode) {
            mode = DEFAULT_CHMOD;
        }
        return this.pushStream(createReadStream(file), path, mode);
    }

    pushStream(stream: Readable, path: string, mode = DEFAULT_CHMOD) {
        mode |= Stats.S_IFREG;
        this._sendCommandWithArg(Protocol.SEND, `${path},${mode}`);
        return this._writeData(stream, Math.floor(Date.now() / 1000));
    }

    pull(path: string) {
        this._sendCommandWithArg(Protocol.RECV, `${path}`);
        return this._readData();
    }

    end() {
        this.connection.end();
        return this;
    }

    tempFile(path: string) {
        return Sync.temp(path);
    }

    private async _writeData(stream: Readable, timeStamp: number) {
        const controller = new AbortController();
        let writer: Promise<any>;
        const transfer = new PushTransfer();

        const writeData = async (signal?: AbortSignal) => {
            let endListener: () => void;
            let errorListener: (err: any) => void;
            let readableListener: () => Promise<void>;
            writer = Promise.resolve();
            try {
                await new Promise((resolve, reject) => {
                    endListener = async () => {
                        await writer;
                        this._sendCommandWithLength(Protocol.DONE, timeStamp);
                        return resolve();
                    };
                    errorListener = err => reject(err);
                    readableListener = () => writer.then(writeNext);

                    stream.on('end', endListener);
                    stream.on('readable', readableListener);
                    stream.on('error', errorListener);

                    const waitForDrain = async () => {
                        let drainListener: () => void;
                        try {
                            await new Promise(resolve => {
                                drainListener = resolve;
                                this.connection.on('drain', drainListener);
                            });
                        } finally {
                            this.connection.removeListener(
                                'drain',
                                drainListener!,
                            );
                        }
                    };

                    const track = () => transfer.pop();
                    const writeNext = async (): Promise<void> => {
                        let chunk =
                            stream.read(DATA_MAX_LENGTH) || stream.read();
                        if (signal && signal.aborted) {
                            throw new CancellationError();
                        }
                        if (chunk) {
                            this._sendCommandWithLength(
                                Protocol.DATA,
                                chunk.length,
                            );
                            transfer.push(chunk.length);
                            if (this.connection.write(chunk, track)) {
                                return writeNext();
                            } else {
                                await waitForDrain();
                                return writeNext();
                            }
                        }
                    };
                });
            } finally {
                stream.removeListener('end', endListener!);
                stream.removeListener('readable', readableListener!);
                stream.removeListener('error', errorListener!);
                controller.abort();
            }
        };

        const readReply = async (signal?: AbortSignal) => {
            const reply = await this.parser.readAscii(4, signal);
            switch (reply) {
                case Protocol.OKAY:
                    await this.parser.readBytes(4, signal);
                    return true;
                case Protocol.FAIL:
                    return this._readError();
                default:
                    return this.parser.unexpected(reply, 'OKAY or FAIL');
            }
        };

        // While I can't think of a case that would break this double-Promise
        // writer-reader arrangement right now, it's not immediately obvious
        // that the code is correct and it may or may not have some failing
        // edge cases. Refactor pending.

        writer = (async () => {
            try {
                return await writeData(controller.signal);
            } catch (err) {
                if (err instanceof CancellationError) {
                    return this.connection.end();
                } else {
                    transfer.emit('error', err);
                    controller.abort();
                }
            }
        })();

        (async () => {
            try {
                await readReply(controller.signal);
            } catch (err) {
                if (err instanceof CancellationError) {
                    return;
                } else {
                    transfer.emit('error', err);
                    controller.abort();
                }
            } finally {
                transfer.end();
            }
        })();

        transfer.on('cancel', () => controller.abort());

        return transfer;
    }

    private _readData(): PullTransfer {
        const transfer = new PullTransfer();

        const controller = new AbortController();

        const readNext = async (): Promise<any> => {
            const reply = await this.parser.readAscii(4);
            switch (reply) {
                case Protocol.DATA:
                    const lengthData = await this.parser.readBytes(4);
                    const length = lengthData.readUInt32LE(0);
                    await this.parser.readByteFlow(length, transfer);
                    return readNext();
                case Protocol.DONE:
                    await this.parser.readBytes(4);
                    return true;
                case Protocol.FAIL:
                    return this._readError();
                default:
                    return this.parser.unexpected(reply, 'DATA, DONE or FAIL');
            }
        };

        const cancelListener = () => controller.abort();

        const reader = (async () => {
            try {
                return await readNext();
            } catch (err) {
                if (err instanceof CancellationError) {
                    return await this.connection.end();
                } else {
                    transfer.emit('error', err);
                }
            } finally {
                transfer.removeListener('cancel', cancelListener);
                return await transfer.end();
            }
        })();

        transfer.on('cancel', cancelListener);

        return transfer;
    }

    private async _readError(): Promise<never> {
        try {
            const length = await this.parser.readBytes(4);
            const buf = await this.parser.readBytes(length.readUInt32LE(0));
            throw new FailError(buf.toString());
        } finally {
            await this.parser.end();
        }
    }

    _sendCommandWithLength(cmd: string, length: number) {
        if (cmd !== Protocol.DATA) {
            debug(cmd);
        }
        const payload = new Buffer(cmd.length + 4);
        payload.write(cmd, 0, cmd.length);
        payload.writeUInt32LE(length, cmd.length);
        return this.connection.write(payload);
    }

    _sendCommandWithArg(cmd: string, arg: string) {
        debug(`${cmd} ${arg}`);
        const payload = new Buffer(cmd.length + 4 + arg.length);
        let pos = 0;
        payload.write(cmd, pos, cmd.length);
        pos += cmd.length;
        payload.writeUInt32LE(arg.length, pos);
        pos += 4;
        payload.write(arg, pos);
        return this.connection.write(payload);
    }
}

export class EnoentError extends Error {
    code = 'ENOENT';
    errno = 34;
    constructor(public path: string) {
        super(); // TODO check sanity
        Error.call(this);
        this.name = 'EnoentError';
        this.message = `ENOENT, no such file or directory '${path}'`;
        Error.captureStackTrace(this, EnoentError);
    }
}
