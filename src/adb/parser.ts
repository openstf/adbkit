import Protocol from './protocol';
import { Duplex, Writable } from 'stream';
import { CancellationError } from './tracker';

export default class Parser {
    ended = false;
    constructor(public stream: Duplex) {}

    async end() {
        if (this.ended) {
            return true;
        }

        let endListener: () => void;
        let errorListener: (err: any) => void;

        const tryRead = () => {
            while (this.stream.read()) {
                continue;
            }
        };

        this.stream.on('readable', tryRead);

        try {
            return await new Promise<boolean>((resolve, reject) => {
                endListener = () => {
                    this.ended = true;
                    return resolve(true);
                };
                errorListener = err => reject(err);

                this.stream.on('error', errorListener);

                this.stream.on('end', endListener);

                this.stream.read(0);
                this.stream.end();
            });
        } finally {
            this.stream.removeListener('readable', tryRead);
            this.stream.removeListener('error', errorListener!);
            this.stream.removeListener('end', endListener!);
        }
    }

    raw() {
        return this.stream;
    }

    async readAll(signal?: AbortSignal) {
        let endListener: () => void;
        let errorListener: (err: any) => void;
        let tryRead: () => void;
        let all = new Buffer(0);

        try {
            return await new Promise<Buffer>((resolve, reject) => {
                endListener = () => {
                    this.ended = true;
                    return resolve(all);
                };
                errorListener = err => reject(err);

                tryRead = () => {
                    let chunk;
                    while ((chunk = this.stream.read())) {
                        if (signal && signal.aborted) {
                            return reject(new CancellationError());
                        }
                        all = Buffer.concat([all, chunk]);
                    }
                    if (this.ended) {
                        return resolve(all);
                    }
                };

                this.stream.on('readable', tryRead);

                this.stream.on('error', errorListener);

                this.stream.on('end', endListener);

                tryRead();
            });
        } finally {
            this.stream.removeListener('readable', tryRead!);
            this.stream.removeListener('error', errorListener!);
            this.stream.removeListener('end', endListener!);
        }
    }

    async readAscii(howMany: number, signal?: AbortSignal) {
        const chunk = await this.readBytes(howMany, signal);
        return chunk.toString('ascii');
    }

    async readBytes(howMany: number, signal?: AbortSignal) {
        let endListener: () => void;
        let errorListener: (err: any) => void;
        let tryRead: () => void;

        try {
            const buf = await new Promise<Buffer>((resolve, reject) => {
                tryRead = async () => {
                    if (signal && signal.aborted) {
                        return reject(new CancellationError());
                    }
                    if (howMany) {
                        let chunk: Buffer = this.stream.read(howMany);
                        if (chunk) {
                            // If the stream ends while still having unread bytes, the read call
                            // will ignore the limit and just return what it's got.
                            howMany -= chunk.length;
                            if (howMany === 0) {
                                return resolve(chunk);
                            }
                        }
                        if (this.ended) {
                            return reject(new PrematureEOFError(howMany));
                        }
                    } else {
                        return resolve(new Buffer(0));
                    }
                };

                endListener = () => {
                    this.ended = true;
                    return reject(new PrematureEOFError(howMany));
                };

                errorListener = err => reject(err);

                this.stream.on('readable', tryRead);
                this.stream.on('error', errorListener);
                this.stream.on('end', endListener);

                tryRead();
            });
            if (signal && signal.aborted) {
                throw new CancellationError();
            }
            return buf;
        } finally {
            this.stream.removeListener('readable', tryRead!);
            this.stream.removeListener('error', errorListener!);
            this.stream.removeListener('end', endListener!);
        }
    }

    async readByteFlow(
        howMany: number,
        targetStream: Writable,
        signal?: AbortSignal,
    ) {
        let endListener: () => void;
        let errorListener: (err: any) => void;
        let tryRead: () => void;

        try {
            await new Promise<void>((resolve, reject) => {
                tryRead = () => {
                    if (howMany) {
                        // Try to get the exact amount we need first. If unsuccessful, take
                        // whatever is available, which will be less than the needed amount.
                        let chunk;
                        while (
                            (chunk =
                                this.stream.read(howMany) || this.stream.read())
                        ) {
                            howMany -= chunk.length;
                            targetStream.write(chunk);
                            if (howMany === 0) {
                                return resolve();
                            }
                        }
                        if (this.ended) {
                            return reject(new PrematureEOFError(howMany));
                        }
                    } else {
                        return resolve();
                    }
                };

                endListener = () => {
                    this.ended = true;
                    return reject(new PrematureEOFError(howMany));
                };

                errorListener = err => reject(err);

                this.stream.on('readable', tryRead);
                this.stream.on('error', errorListener);
                this.stream.on('end', endListener);

                tryRead();
            });
            if (signal && signal.aborted) {
                throw new CancellationError();
            }
        } finally {
            this.stream.removeListener('readable', tryRead!);
            this.stream.removeListener('error', errorListener!);
            this.stream.removeListener('end', endListener!);
        }
    }

    async readError(signal?: AbortSignal): Promise<never> {
        const value = await this.readValue(signal);
        throw new FailError(value.toString());
    }

    async readValue(signal?: AbortSignal) {
        const value = await this.readAscii(4);
        const length = Protocol.decodeLength(value);
        return this.readBytes(length, signal);
    }

    async readUntil(code: number, signal?: AbortSignal) {
        let skipped = new Buffer(0);
        const read = async (): Promise<Buffer> => {
            if (signal && signal.aborted) {
                throw new CancellationError();
            }
            const chunk = await this.readBytes(1, signal);
            if (chunk[0] === code) {
                return skipped;
            } else {
                skipped = Buffer.concat([skipped, chunk]);
                return read();
            }
        };
        return read();
    }

    async searchLine(
        re: RegExp,
        signal?: AbortSignal,
    ): Promise<RegExpExecArray> {
        const line = await this.readLine(signal);
        let match = re.exec(line.toString());
        if (match) {
            return match;
        } else {
            return this.searchLine(re, signal);
        }
    }

    async readLine(signal?: AbortSignal) {
        const line = await this.readUntil(0x0a, signal); // '\n'
        if (line[line.length - 1] === 0x0d) {
            // '\r'
            return line.slice(0, -1);
        } else {
            return line;
        }
    }

    async unexpected(data: any, expected: any): Promise<never> {
        throw new UnexpectedDataError(data, expected);
    }
}

export class FailError extends Error {
    constructor(message: string) {
        super(); // TODO check sanity
        Error.call(this);
        this.name = 'FailError';
        this.message = `Failure: '${message}'`;
        Error.captureStackTrace(this, FailError);
    }
}

export class PrematureEOFError extends Error {
    missingBytes: number;
    constructor(howManyMissing: number) {
        super(); // TODO check sanity
        Error.call(this);
        this.name = 'PrematureEOFError';
        this.message = `Premature end of stream, needed ${howManyMissing} more bytes`;
        this.missingBytes = howManyMissing;
        Error.captureStackTrace(this, PrematureEOFError);
    }
}

export class UnexpectedDataError extends Error {
    constructor(public unexpected: any, public expected: any) {
        super(); // TODO check sanity
        Error.call(this);
        this.name = 'UnexpectedDataError';
        this.message = `Unexpected '${unexpected}', was expecting ${expected}`;
        Error.captureStackTrace(this, UnexpectedDataError);
    }
}
