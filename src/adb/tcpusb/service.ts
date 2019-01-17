import { EventEmitter } from 'events';

import debugFunc from 'debug';
const debug = debugFunc('adb:tcpusb:service');

import Protocol from '../protocol';
import Packet from './packet';
import { Readable } from 'stream';
import Client from '../client';
import Socket from './socket';
import Connection from '../connection';

export default class Service extends EventEmitter {
    opened = false;
    ended = false;
    transport: Connection | null = null;
    needAck = false;
    constructor(
        public client: Client,
        public serial: string,
        public localId: number,
        public remoteId: number,
        public socket: Socket,
    ) {
        super();
    }

    end() {
        if (this.transport) {
            this.transport!.end();
        }
        if (this.ended) {
            return this;
        }
        debug('O:A_CLSE');
        const localId = this.opened ? this.localId : 0; // Zero can only mean a failed open
        try {
            // We may or may not have gotten here due to @socket ending, so write
            // may fail.
            this.socket.write(
                Packet.assemble(Packet.A_CLSE, localId, this.remoteId, null),
            );
        } catch (err) {}
        // Let it go
        this.transport = null;
        this.ended = true;
        this.emit('end');
        return this;
    }

    async handle(packet: Packet) {
        try {
            switch (packet.command) {
                case Packet.A_OPEN:
                    return this._handleOpenPacket(packet);
                case Packet.A_OKAY:
                    return this._handleOkayPacket(packet);
                case Packet.A_WRTE:
                    return this._handleWritePacket(packet);
                case Packet.A_CLSE:
                    return this._handleClosePacket(packet);
                default:
                    throw new Error(`Unexpected packet ${packet.command}`);
            }
        } catch (err) {
            this.emit('error', err);
            this.end();
        }
    }

    private async _handleOpenPacket(packet: Packet) {
        try {
            debug('I:A_OPEN', packet);
            const transport = await this.client.transport(this.serial);
            this.transport = transport;
            if (this.ended) {
                throw new LateTransportError();
            }
            this.transport!.write(
                Protocol.encodeData(packet.data.slice(0, -1)),
            ); // Discard null byte at end
            const parser = this.transport!.parser!;
            const reply = await parser.readAscii(4);
            switch (reply) {
                case Protocol.OKAY:
                    debug('O:A_OKAY');
                    this.socket.write(
                        Packet.assemble(
                            Packet.A_OKAY,
                            this.localId,
                            this.remoteId,
                            null,
                        ),
                    );
                    this.opened = true;
                    return true;
                case Protocol.FAIL:
                    return parser.readError();
                default:
                    return parser.unexpected(reply, 'OKAY or FAIL');
            }
        } finally {
            this.end();
        }
    }

    _handleOkayPacket(packet: Packet) {
        debug('I:A_OKAY', packet);
        if (this.ended) {
            return;
        }
        if (!this.transport) {
            throw new PrematurePacketError(packet);
        }
        this.needAck = false;
        return this._tryPush();
    }

    _handleWritePacket(packet: Packet) {
        debug('I:A_WRTE', packet);
        if (this.ended) {
            return;
        }
        if (!this.transport) {
            throw new PrematurePacketError(packet);
        }
        if (packet.data) {
            this.transport!.write(packet.data);
        }
        debug('O:A_OKAY');
        return this.socket.write(
            Packet.assemble(Packet.A_OKAY, this.localId, this.remoteId, null),
        );
    }

    _handleClosePacket(packet: Packet) {
        debug('I:A_CLSE', packet);
        if (this.ended) {
            return;
        }
        if (!this.transport) {
            throw new PrematurePacketError(packet);
        }
        return this.end();
    }

    _tryPush() {
        if (this.needAck || this.ended) {
            return;
        }
        let chunk = this._readChunk(this.transport!.socket!);
        if (chunk) {
            debug('O:A_WRTE');
            this.socket.write(
                Packet.assemble(
                    Packet.A_WRTE,
                    this.localId,
                    this.remoteId,
                    chunk,
                ),
            );
            this.needAck = true;
        }
    }

    _readChunk(stream: Readable) {
        return stream.read(this.socket.maxPayload) || stream.read();
    }
}

export class PrematurePacketError extends Error {
    constructor(public packet: Packet) {
        super(); // TODO check sanity
        Error.call(this);
        this.name = 'PrematurePacketError';
        this.message = 'Premature packet';
        Error.captureStackTrace(this, PrematurePacketError);
    }
}

export class LateTransportError extends Error {
    constructor() {
        super(); // TODO check sanity
        Error.call(this);
        this.name = 'LateTransportError';
        this.message = 'Late transport';
        Error.captureStackTrace(this, LateTransportError);
    }
}
