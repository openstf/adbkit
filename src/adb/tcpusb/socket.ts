import { randomBytes } from 'crypto';
import { EventEmitter } from 'events';
import { promisify } from 'util';
import forge from 'node-forge';

import debugFunc from 'debug';
const debug = debugFunc('adb:tcpusb:socket');

import Auth from '../auth';
import Packet from './packet';
import Net from 'net';
import PacketReader from './packetreader';
import Service from './service';
import ServiceMap from './servicemap';
import RollingCounter from './rollingcounter';
import Client from '../client';

const randomBytesAsync = promisify(randomBytes);

const UINT32_MAX = 0xffffffff;
const UINT16_MAX = 0xffff;

const AUTH_TOKEN = 1;
const AUTH_SIGNATURE = 2;
const AUTH_RSAPUBLICKEY = 3;

const TOKEN_LENGTH = 20;

export interface SocketOptions {
    auth: (key: forge.pki.rsa.PublicKey) => Promise<void>;
}

export default class Socket extends EventEmitter {
    reader: PacketReader;
    ended = false;
    version = 1;
    maxPayload = 4096;
    authorized = false;
    syncToken = new RollingCounter(UINT32_MAX);
    remoteId = new RollingCounter(UINT32_MAX);
    services = new ServiceMap();
    remoteAddress = this.socket.remoteAddress;
    token: Buffer | null = null;
    signature: Buffer | null = null;
    options: SocketOptions;

    constructor(
        public client: Client,
        public serial: string,
        public socket: Net.Socket,
        options: Partial<SocketOptions> = {},
    ) {
        super();
        if (!options.auth) {
            options.auth = () => Promise.resolve();
        }
        this.options = options as SocketOptions;
        this.socket.setNoDelay(true);
        this.reader = new PacketReader(this.socket)
            .on('packet', this._handle.bind(this))
            .on('error', err => {
                debug(`PacketReader error: ${err.message}`);
                return this.end();
            })
            .on('end', this.end.bind(this));
    }

    end() {
        if (this.ended) {
            return this;
        }
        // End services first so that they can send a final payload before FIN.
        this.services.end();
        this.socket.end();
        this.ended = true;
        this.emit('end');
        return this;
    }

    _error(err: any) {
        this.emit('error', err);
        return this.end();
    }

    async _handle(packet: Packet) {
        if (this.ended) {
            return;
        }
        this.emit('userActivity', packet);
        try {
            switch (packet.command) {
                case Packet.A_SYNC:
                    return await this._handleSyncPacket(packet);
                case Packet.A_CNXN:
                    return await this._handleConnectionPacket(packet);
                case Packet.A_OPEN:
                    return await this._handleOpenPacket(packet);
                case Packet.A_OKAY:
                case Packet.A_WRTE:
                case Packet.A_CLSE:
                    return await this._forwardServicePacket(packet);
                case Packet.A_AUTH:
                    return await this._handleAuthPacket(packet);
                default:
                    throw new Error(`Unknown command ${packet.command}`);
            }
        } catch (err) {
            if (err instanceof AuthError || err instanceof UnauthorizedError) {
                this.end();
            } else {
                this._error(err);
            }
        }
    }

    _handleSyncPacket(packet: Packet) {
        // No need to do anything?
        debug('I:A_SYNC');
        debug('O:A_SYNC');
        return this.write(
            Packet.assemble(Packet.A_SYNC, 1, this.syncToken.next(), null),
        );
    }

    async _handleConnectionPacket(packet: Packet) {
        debug('I:A_CNXN', packet);
        const version = Packet.swap32(packet.arg0);
        this.maxPayload = Math.min(UINT16_MAX, packet.arg1);
        const token = await this._createToken();
        this.token = token;
        debug(`Created challenge '${this.token.toString('base64')}'`);
        debug('O:A_AUTH');
        return this.write(
            Packet.assemble(Packet.A_AUTH, AUTH_TOKEN, 0, this.token),
        );
    }

    async _handleAuthPacket(packet: Packet) {
        debug('I:A_AUTH', packet);
        switch (packet.arg0) {
            case AUTH_SIGNATURE:
                // Store first signature, ignore the rest
                debug(`Received signature '${packet.data.toString('base64')}'`);
                if (!this.signature) {
                    this.signature = packet.data;
                }
                debug('O:A_AUTH');
                return this.write(
                    Packet.assemble(Packet.A_AUTH, AUTH_TOKEN, 0, this.token),
                );
            case AUTH_RSAPUBLICKEY:
                if (!this.signature) {
                    throw new AuthError('Public key sent before signature');
                }
                if (!packet.data || !(packet.data.length >= 2)) {
                    throw new AuthError('Empty RSA public key');
                }
                debug(
                    `Received RSA public key '${packet.data.toString(
                        'base64',
                    )}'`,
                );
                const key = await Auth.parsePublicKey(
                    this._skipNull(packet.data),
                );
                const digest = this.token!.toString('binary');
                const sig = this.signature.toString('binary');
                if (!key.verify(digest, sig)) {
                    debug('Signature mismatch');
                    throw new AuthError('Signature mismatch');
                }
                debug('Signature verified');
                try {
                    await this.options.auth!(key);
                } catch (err) {
                    debug('Connection rejected by user-defined auth handler');
                    throw new AuthError('Rejected by user-defined handler');
                }
                const id = await this._deviceId();
                this.authorized = true;
                debug('O:A_CNXN');
                return this.write(
                    Packet.assemble(
                        Packet.A_CNXN,
                        Packet.swap32(this.version),
                        this.maxPayload,
                        id,
                    ),
                );
            default:
                throw new Error(`Unknown authentication method ${packet.arg0}`);
        }
    }

    async _handleOpenPacket(packet: Packet) {
        if (!this.authorized) {
            throw new UnauthorizedError();
        }
        const remoteId = packet.arg0;
        const localId = this.remoteId.next();
        if (!packet.data || !(packet.data.length >= 2)) {
            throw new Error('Empty service name');
        }
        const name = this._skipNull(packet.data);
        debug(`Calling ${name}`);
        const service = new Service(
            this.client,
            this.serial,
            localId,
            remoteId,
            this,
        );
        try {
            return await new Promise((resolve, reject) => {
                service.on('error', reject);
                service.on('end', resolve);
                this.services.insert(localId, service);
                debug(
                    `Handling ${this.services.count} services simultaneously`,
                );
                return service.handle(packet);
            });
        } catch (err) {
            return true;
        } finally {
            this.services.remove(localId);
            debug(`Handling ${this.services.count} services simultaneously`);
            return service.end();
        }
    }

    _forwardServicePacket(packet: Packet) {
        if (!this.authorized) {
            throw new UnauthorizedError();
        }
        const remoteId = packet.arg0;
        const localId = packet.arg1;
        const service = this.services.get(localId);
        if (service) {
            return service.handle(packet);
        } else {
            return debug(
                'Received a packet to a service that may have been closed already',
            );
        }
    }

    write(chunk: any) {
        if (this.ended) {
            return;
        }
        return this.socket.write(chunk);
    }

    _createToken() {
        return randomBytesAsync(TOKEN_LENGTH);
    }

    _skipNull(data: Buffer) {
        return data.slice(0, -1); // Discard null byte at end
    }

    async _deviceId() {
        debug('Loading device properties to form a standard device ID');
        const properties = await this.client.getProperties(this.serial);
        const id = ['ro.product.name', 'ro.product.model', 'ro.product.device']
            .map(prop => `${prop}=${properties![prop]};`)
            .join('');
        return new Buffer(`device::${id}\0`);
    }
}

export class AuthError extends Error {
    constructor(public message: string) {
        super(); // TODO check sanity
        Error.call(this);
        this.name = 'AuthError';
        Error.captureStackTrace(this, AuthError);
    }
}

export class UnauthorizedError extends Error {
    constructor() {
        super(); // TODO check sanity
        Error.call(this);
        this.name = 'UnauthorizedError';
        this.message = 'Unauthorized access';
        Error.captureStackTrace(this, UnauthorizedError);
    }
}
