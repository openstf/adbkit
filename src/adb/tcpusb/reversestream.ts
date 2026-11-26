import * as Net from 'net';
import d from 'debug';
import Packet from './packet';
import Socket from './socket';
import SendWindow, { INITIAL_WINDOW } from './sendwindow';
import ReceiveWindow from './receivewindow';

const debug = d('adb:tcpusb:reversestream');

/**
 * A stream the device opened through `adb reverse`, relayed to the client as a device-initiated A_OPEN.
 */
export default class ReverseStream {
  private remoteId = 0;
  private window: SendWindow;
  private receive: ReceiveWindow;
  private opened = false;
  private drained = false;
  private ended = false;

  constructor(
    private socket: Socket,
    public readonly localId: number,
    private conn: Net.Socket,
  ) {
    this.window = new SendWindow(socket.delayedAck);
    this.receive = new ReceiveWindow(this.window.delayed, socket.maxPayload);
    conn.on('readable', () => this._tryPush());
    // Flush a half-closed conn before A_CLSE: the client's A_OKAY can arrive after the device side ended.
    conn.on('end', () => {
      this.drained = true;
      this._tryPush();
    });
    conn.on('error', () => {
      conn.destroy();
      this.end();
    });
  }

  public open(service: string): void {
    debug(`O:A_OPEN ${service}`);
    // With delayed acks, arg1 is how much the client may send us before our first A_OKAY.
    const credit = this.window.delayed ? INITIAL_WINDOW : 0;
    this.socket.write(Packet.assemble(Packet.A_OPEN, this.localId, credit, Buffer.from(`${service}\x00`)));
  }

  public handle(packet: Packet): Promise<boolean> {
    switch (packet.command) {
      case Packet.A_OKAY:
        debug('I:A_OKAY', packet);
        if (!this.opened) {
          this.opened = true;
          this.remoteId = packet.arg0;
        }
        this.window.acked(packet);
        this._tryPush();
        break;
      case Packet.A_WRTE:
        debug('I:A_WRTE', packet);
        if (!this.opened) {
          // The client must accept our A_OPEN before it writes; we would have no remote id to ack to.
          debug('A_WRTE before the stream was open');
          this.end();
          break;
        }
        this._write(packet.data || Buffer.alloc(0));
        break;
      case Packet.A_CLSE:
        debug('I:A_CLSE', packet);
        this.end();
        break;
    }
    return Promise.resolve(true);
  }

  public end(): ReverseStream {
    if (this.ended) {
      return this;
    }
    this.ended = true;
    this.conn.end(); // Not destroy(): the client's last A_WRTE may still be buffered.
    debug('O:A_CLSE');
    this.socket.write(Packet.assemble(Packet.A_CLSE, this.localId, this.remoteId, null));
    this.socket.removeService(this.localId);
    return this;
  }

  private _write(data: Buffer): void {
    if (!this.receive.take(data.length)) {
      debug('A_WRTE past what the client was allowed to send');
      this.end();
      return;
    }
    // Ack or credit the client only once the bytes are written, so a slow reader pushes back.
    // Without delayed_ack the client waits for each A_OKAY, so this holds back its next packet.
    this.conn.write(data, (err?: Error | null) => {
      this.receive.release(data.length);
      if (err) {
        debug('conn write failed', err);
        this.end();
        return;
      }
      if (!this.ended) {
        debug('O:A_OKAY');
        this.socket.write(Packet.assemble(Packet.A_OKAY, this.localId, this.remoteId, this.window.ack(data.length)));
      }
    });
  }

  private _tryPush(): void {
    while (this.opened && !this.ended && this.window.canSend) {
      const chunk = this.conn.read(this.socket.maxPayload) || this.conn.read();
      if (!chunk) {
        if (this.drained) {
          this.end();
        }
        return;
      }
      debug('O:A_WRTE');
      this.socket.write(Packet.assemble(Packet.A_WRTE, this.localId, this.remoteId, chunk));
      this.window.sent(chunk.length);
    }
  }
}
