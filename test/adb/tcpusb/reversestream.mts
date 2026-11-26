import { expect } from 'chai';
import PacketModule from '../../../dist/src/adb/tcpusb/packet.js';
import ReverseStreamModule from '../../../dist/src/adb/tcpusb/reversestream.js';

const Packet = PacketModule.default;
const ReverseStream = ReverseStreamModule.default;

function setup(delayedAck: boolean, open = true) {
  const written: Buffer[] = [];
  const socket = {
    delayedAck,
    maxPayload: 4096,
    write: (chunk: Buffer) => written.push(chunk),
    removeService: () => undefined,
  };
  const pending: Array<(err?: Error | null) => void> = [];
  const conn = {
    on: () => conn,
    read: (): Buffer | null => null,
    write: (_data: Buffer, cb: (err?: Error | null) => void) => pending.push(cb),
    end: () => undefined,
    destroy: () => undefined,
  };
  const stream = new ReverseStream(socket as never, 1, conn as never);
  if (open) {
    // The client's A_OKAY to our A_OPEN names its id for the stream.
    void stream.handle(new Packet(Packet.A_OKAY, 7, 1, 0, 0, 0, null));
  }
  const commands = () => written.map((chunk) => chunk.readUInt32LE(0));
  return { stream, pending, written, commands };
}

const write = () => new Packet(Packet.A_WRTE, 7, 1, 4, 0, 0, Buffer.from('data'));

for (const delayedAck of [false, true]) {
  describe(`TcpUsb ReverseStream write ${delayedAck ? 'with' : 'without'} delayed_ack`, function () {
    it('should hold the A_OKAY until the local reader has taken the bytes', async function () {
      const { stream, pending, written, commands } = setup(delayedAck);
      await stream.handle(write());
      expect(commands()).to.not.include(Packet.A_OKAY);

      pending[0]();
      expect(commands()).to.deep.equal([Packet.A_OKAY]);
      const okay = written[0];
      const length = delayedAck ? 4 : 0;
      expect([okay.readUInt32LE(4), okay.readUInt32LE(8), okay.readUInt32LE(12)]).to.deep.equal([1, 7, length]);
      if (delayedAck) {
        expect(okay.readUInt32LE(24)).to.equal(4);
      }
    });

    it('should close the stream instead of acking when the write fails', async function () {
      const { stream, pending, commands } = setup(delayedAck);
      await stream.handle(write());

      pending[0](new Error('reader gone'));
      expect(commands()).to.not.include(Packet.A_OKAY);
      expect(commands()).to.include(Packet.A_CLSE);
    });

    it('should not ack a write that completes after the client closed the stream', async function () {
      const { stream, pending, commands } = setup(delayedAck);
      await stream.handle(write());
      await stream.handle(new Packet(Packet.A_CLSE, 7, 1, 0, 0, 0, null));

      pending[0]();
      expect(commands()).to.deep.equal([Packet.A_CLSE]);
    });

    it('should close the stream on a write before the client accepted our A_OPEN', async function () {
      const { stream, pending, commands } = setup(delayedAck, false);
      await stream.handle(write());

      expect(pending).to.have.length(0);
      expect(commands()).to.deep.equal([Packet.A_CLSE]);
    });
  });
}

// adb's INITIAL_DELAYED_ACK_BYTES: the credit we give a delayed_ack client.
const WINDOW = 32 * 1024 * 1024;
const wrte = (bytes: number) => new Packet(Packet.A_WRTE, 7, 1, bytes, 0, 0, Buffer.alloc(bytes));

describe('TcpUsb ReverseStream write past what the client may send', function () {
  it('should close the stream on a second write before our A_OKAY without delayed_ack', async function () {
    const { stream, pending, commands } = setup(false);
    await stream.handle(wrte(4));
    await stream.handle(wrte(4));
    expect(pending).to.have.length(1);
    expect(commands()).to.deep.equal([Packet.A_CLSE]);

    pending[0]();
    expect(commands()).to.deep.equal([Packet.A_CLSE]);
  });

  it('should take the next write once the last one was acked without delayed_ack', async function () {
    const { stream, pending, commands } = setup(false);
    await stream.handle(wrte(4));
    pending[0]();
    await stream.handle(wrte(4));
    expect(pending).to.have.length(2);
    expect(commands()).to.deep.equal([Packet.A_OKAY]);
  });

  it('should take up to the credit and one more payload with delayed_ack', async function () {
    const { stream, pending, commands } = setup(true);
    await stream.handle(wrte(WINDOW));
    await stream.handle(wrte(4096));
    expect(pending).to.have.length(2);
    expect(commands()).to.deep.equal([]);

    await stream.handle(wrte(1));
    expect(pending).to.have.length(2);
    expect(commands()).to.deep.equal([Packet.A_CLSE]);
  });

  it('should give the credit back once the bytes are written with delayed_ack', async function () {
    const { stream, pending, commands } = setup(true);
    await stream.handle(wrte(WINDOW));
    pending[0]();
    await stream.handle(wrte(WINDOW));
    expect(pending).to.have.length(2);
    expect(commands()).to.deep.equal([Packet.A_OKAY]);
  });
});
