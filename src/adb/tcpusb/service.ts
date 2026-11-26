import d from 'debug';
import { EventEmitter } from 'events';
import Packet from './packet';
import Protocol from '../protocol';
import { promiseTry } from '../promise';
import Client from '../client';
import Socket from './socket';
import ReadableStream = NodeJS.ReadableStream;
import Connection from '../connection';
import SendWindow, { INITIAL_WINDOW } from './sendwindow';
const debug = d('adb:tcpusb:service');

class PrematurePacketError extends Error {
  constructor(public packet: Packet) {
    super();
    Object.setPrototypeOf(this, PrematurePacketError.prototype);
    this.name = 'PrematurePacketError';
    this.message = 'Premature packet';
    Error.captureStackTrace(this, Service.PrematurePacketError);
  }
}

class LateTransportError extends Error {
  constructor() {
    super();
    Object.setPrototypeOf(this, LateTransportError.prototype);
    this.name = 'LateTransportError';
    this.message = 'Late transport';
    Error.captureStackTrace(this, Service.LateTransportError);
  }
}

export default class Service extends EventEmitter {
  public static PrematurePacketError = PrematurePacketError;
  public static LateTransportError = LateTransportError;

  private opened = false;
  private ended = false;
  private transport?: Connection;
  private window: SendWindow;

  constructor(
    private client: Client,
    private serial: string,
    private localId: number,
    private remoteId: number,
    private socket: Socket,
  ) {
    super();
    this.window = new SendWindow(socket.delayedAck);
  }

  public end(): Service {
    if (this.transport) {
      this.transport.end();
    }
    if (this.ended) {
      return this;
    }
    debug('O:A_CLSE');
    const localId = this.opened ? this.localId : 0; // Zero can only mean a failed open
    try {
      // We may or may not have gotten here due to @socket ending, so write
      // may fail.
      this.socket.write(Packet.assemble(Packet.A_CLSE, localId, this.remoteId, null));
    } catch {
      // Let it go
    }
    this.transport = null;
    this.ended = true;
    this.emit('end');
    return this;
  }

  public handle(packet: Packet): Promise<Service | boolean> {
    return promiseTry(() => this._dispatch(packet)).catch((err) => {
      // End first: without an 'error' listener the emit throws.
      const ended = this.end();
      this.emit('error', err);
      return ended;
    });
  }

  private _dispatch(packet: Packet): Promise<Service | boolean> | Service | boolean {
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
  }

  private _handleOpenPacket(packet): Promise<boolean> {
    debug('I:A_OPEN', packet);
    // With delayed acks, arg1 is how much the client lets us send before its first A_OKAY; 0 means it has them off.
    this.window = new SendWindow(this.socket.delayedAck && packet.arg1 > 0, packet.arg1);
    return this.client
      .getDevice(this.serial)
      .transport()
      .then((transport) => {
        this.transport = transport;
        if (this.ended) {
          throw new LateTransportError();
        }
        return this.socket.rewriteReverseService(packet.data.slice(0, -1).toString()); // Discard null byte at end
      })
      .then((name) => {
        this.transport.write(Protocol.encodeData(name));
        return this.transport.parser.readAscii(4).then((reply) => {
          switch (reply) {
            case Protocol.OKAY:
              debug('O:A_OKAY');
              this.socket.write(
                Packet.assemble(Packet.A_OKAY, this.localId, this.remoteId, this.window.ack(INITIAL_WINDOW)),
              );
              return (this.opened = true);
            case Protocol.FAIL:
              return this.transport.parser.readError();
            default:
              return this.transport.parser.unexpected(reply, 'OKAY or FAIL');
          }
        });
      })
      .then(() => {
        return new Promise<boolean>((resolve, reject) => {
          this.transport.socket
            .on('readable', () => this._tryPush())
            .on('end', resolve)
            .on('error', reject);
          return this._tryPush();
        });
      })
      .finally(() => {
        return this.end();
      });
  }

  private _handleOkayPacket(packet: Packet): boolean | undefined {
    debug('I:A_OKAY', packet);
    if (this.ended) {
      return;
    }
    if (!this.transport) {
      throw new Service.PrematurePacketError(packet);
    }
    this.window.acked(packet);
    return this._tryPush();
  }

  private _handleWritePacket(packet: Packet): boolean | undefined {
    debug('I:A_WRTE', packet);
    if (this.ended) {
      return;
    }
    if (!this.transport) {
      throw new Service.PrematurePacketError(packet);
    }
    const data = packet.data || Buffer.alloc(0);
    // Ack or credit the client only once the bytes are written, so a slow device pushes back.
    // Without delayed_ack the client waits for each A_OKAY, so this holds back its next packet.
    this.transport.write(data, (err?: Error | null) => {
      if (err) {
        debug('transport write failed', err);
        this.end();
        return;
      }
      if (!this.ended) {
        debug('O:A_OKAY');
        this.socket.write(Packet.assemble(Packet.A_OKAY, this.localId, this.remoteId, this.window.ack(data.length)));
      }
    });
    return true;
  }

  private _handleClosePacket(packet: Packet): Service | undefined {
    debug('I:A_CLSE', packet);
    if (this.ended) {
      return;
    }
    if (!this.transport) {
      throw new Service.PrematurePacketError(packet);
    }
    return this.end();
  }

  private _tryPush(): boolean | undefined {
    let pushed = false;
    while (!this.ended && this.window.canSend) {
      const chunk = this._readChunk(this.transport.socket);
      if (!chunk) {
        break;
      }
      debug('O:A_WRTE');
      this.socket.write(Packet.assemble(Packet.A_WRTE, this.localId, this.remoteId, chunk));
      this.window.sent(chunk.length);
      pushed = true;
    }
    return pushed || undefined;
  }

  private _readChunk(stream: ReadableStream): Buffer {
    return (stream.read(this.socket.maxPayload) || stream.read()) as Buffer;
  }
}
