import Net from 'net';
import { EventEmitter } from 'events';
import Socket, { SocketOptions } from './socket';
import Client from '../client';

export default class Server extends EventEmitter {
    server: Net.Server;
    connections: Socket[] = [];

    constructor(
        public client: Client,
        public serial: string,
        public options: SocketOptions,
    ) {
        super();
        this.server = Net.createServer({
            allowHalfOpen: true,
        });
        this.server.on('error', err => {
            return this.emit('error', err);
        });
        this.server.on('listening', () => {
            return this.emit('listening');
        });
        this.server.on('close', () => {
            return this.emit('close');
        });
        this.server.on('connection', conn => {
            const socket = new Socket(
                this.client,
                this.serial,
                conn,
                this.options,
            );
            this.connections.push(socket);
            socket.on('error', err => {
                // 'conn' is guaranteed to get ended
                return this.emit('error', err);
            });
            socket.once('end', () => {
                // 'conn' is guaranteed to get ended
                return (this.connections = this.connections.filter(
                    val => val !== socket,
                ));
            });
            return this.emit('connection', socket);
        });
    }

    listen(...args: any[]) {
        this.server.listen(...args);
        return this;
    }

    close() {
        this.server.close();
        return this;
    }

    end() {
        for (let conn of this.connections) {
            conn.end();
        }
        return this;
    }
}
