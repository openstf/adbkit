import Net from 'net';
import debugFunc from 'debug';
const debug = debugFunc('adb:connection');
import { EventEmitter } from 'events';
import { execFile, ExecFileOptions } from 'child_process';
import { promisify } from 'util';

import Parser from './parser';
import dump from './dump';
import { Duplex } from 'stream';

const execFileAsync = promisify(execFile);

export interface IConnection {
    socket: Duplex | null;
    parser: Parser | null;

    end(): this;
    write(data: Buffer, callback?: () => void): this;
}

export default class Connection extends EventEmitter implements IConnection {
    socket: Net.Socket | null = null;
    parser: Parser | null = null;
    triedStarting = false;

    constructor(public options: Net.NetConnectOpts & { bin: string }) {
        super();
    }

    connect() {
        this.socket = Net.connect(this.options);
        this.socket.setNoDelay(true);
        this.parser = new Parser(this.socket);
        this.socket
            .on('connect', () => this.emit('connect'))
            .on('end', () => this.emit('end'))
            .on('drain', () => this.emit('drain'))
            .on('timeout', () => this.emit('timeout'))
            .on('error', err => this._handleError(err))
            .on('close', hadError => this.emit('close', hadError));
        return this;
    }

    end() {
        this.socket!.end();
        return this;
    }

    write(data: Buffer, callback?: () => void) {
        this.socket!.write(dump(data), callback);
        return this;
    }

    async startServer() {
        debug(`Starting ADB server via '${this.options.bin} start-server'`);
        return this._exec(['start-server'], {});
    }

    private async _exec(args: string[], options: ExecFileOptions) {
        debug(`CLI: ${this.options.bin} ${args.join(' ')}`);
        return execFileAsync(this.options.bin, args, options);
    }

    private async _handleError(err: Error) {
        if ((err as any).code === 'ECONNREFUSED' && !this.triedStarting) {
            debug("Connection was refused, let's try starting the server once");
            this.triedStarting = true;
            try {
                await this.startServer();
                this.connect();
            } catch (err) {
                this._handleError(err);
            }
        } else {
            debug(`Connection had an error: ${err.message}`);
            this.emit('error', err);
            this.end();
        }
    }
}
