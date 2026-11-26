import { expect } from 'chai';
import PacketModule from '../../../dist/src/adb/tcpusb/packet.js';
import ServiceModule from '../../../dist/src/adb/tcpusb/service.js';

const Packet = PacketModule.default;
const Service = ServiceModule.default;

function setup(delayedAck: boolean) {
  const written: Buffer[] = [];
  const socket = { delayedAck, maxPayload: 4096, write: (chunk: Buffer) => written.push(chunk) };
  const pending: Array<(err?: Error | null) => void> = [];
  const transport = {
    write: (_data: Buffer, cb: (err?: Error | null) => void) => pending.push(cb),
    end: () => undefined,
  };
  const service = new Service(null, 'serial', 1, 7, socket as never);
  (service as unknown as { transport: typeof transport }).transport = transport;
  const commands = () => written.map((chunk) => chunk.readUInt32LE(0));
  return { service, pending, written, commands };
}

describe('TcpUsb Service write without delayed_ack', function () {
  it('should hold the A_OKAY until the device side has taken the bytes', async function () {
    const { service, pending, written, commands } = setup(false);
    await service.handle(new Packet(Packet.A_WRTE, 7, 1, 4, 0, 0, Buffer.from('data')));
    expect(commands()).to.not.include(Packet.A_OKAY);

    pending[0]();
    expect(commands()).to.deep.equal([Packet.A_OKAY]);
    const okay = written[0];
    expect([okay.readUInt32LE(4), okay.readUInt32LE(8), okay.readUInt32LE(12)]).to.deep.equal([1, 7, 0]);
  });

  it('should close the stream instead of acking when the write fails', async function () {
    const { service, pending, commands } = setup(false);
    await service.handle(new Packet(Packet.A_WRTE, 7, 1, 4, 0, 0, Buffer.from('data')));

    pending[0](new Error('device gone'));
    expect(commands()).to.not.include(Packet.A_OKAY);
    expect(commands()).to.include(Packet.A_CLSE);
  });
});

describe('TcpUsb Service write with delayed_ack', function () {
  it('should credit the client only once the device side has taken the bytes', async function () {
    const { service, pending, written, commands } = setup(true);
    await service.handle(new Packet(Packet.A_WRTE, 7, 1, 4, 0, 0, Buffer.from('data')));
    expect(commands()).to.not.include(Packet.A_OKAY);

    pending[0]();
    expect(commands()).to.deep.equal([Packet.A_OKAY]);
    const okay = written[0];
    expect([okay.readUInt32LE(4), okay.readUInt32LE(8), okay.readUInt32LE(12)]).to.deep.equal([1, 7, 4]);
    expect(okay.readUInt32LE(24)).to.equal(4);
  });
});

function opened(delayedAck: boolean, credit: number) {
  const written: Buffer[] = [];
  const socket = {
    delayedAck,
    maxPayload: 4096,
    write: (chunk: Buffer) => written.push(chunk),
    rewriteReverseService: (name: string) => Promise.resolve(name),
  };
  const pending: Array<(err?: Error | null) => void> = [];
  const transport = {
    write: (_data: Buffer, cb?: (err?: Error | null) => void) => cb && pending.push(cb),
    end: () => undefined,
    parser: { readAscii: () => Promise.resolve('OKAY') },
    socket: { on: () => transport.socket, read: (): Buffer | null => null },
  };
  const client = { getDevice: () => ({ transport: () => Promise.resolve(transport) }) };
  const service = new Service(client as never, 'serial', 1, 7, socket as never);
  // Stays pending while the stream is open, so it is not awaited.
  void service.handle(new Packet(Packet.A_OPEN, 7, credit, 7, 0, 0, Buffer.from('shell:\x00')));
  const commands = () => written.map((chunk) => chunk.readUInt32LE(0));
  const settle = () => new Promise((resolve) => setImmediate(resolve));
  return { service, pending, written, commands, settle };
}

describe('TcpUsb Service window chosen at A_OPEN', function () {
  it('should use delayed acks when the client has them and gives credit', async function () {
    const { service, pending, written, commands, settle } = opened(true, 1024);
    await settle();
    expect(commands()).to.deep.equal([Packet.A_OKAY]);
    expect(written[0].readUInt32LE(12)).to.equal(4);
    expect(written[0].readUInt32LE(24)).to.equal(32 * 1024 * 1024);

    await service.handle(new Packet(Packet.A_WRTE, 7, 1, 4, 0, 0, Buffer.from('data')));
    pending[0]();
    expect(commands()).to.deep.equal([Packet.A_OKAY, Packet.A_OKAY]);
    expect(written[1].readUInt32LE(24)).to.equal(4);
  });

  it('should use plain acks when the client gives no credit', async function () {
    const { service, pending, written, commands, settle } = opened(true, 0);
    await settle();
    expect(commands()).to.deep.equal([Packet.A_OKAY]);
    expect(written[0].readUInt32LE(12)).to.equal(0);

    await service.handle(new Packet(Packet.A_WRTE, 7, 1, 4, 0, 0, Buffer.from('data')));
    pending[0]();
    expect(commands()).to.deep.equal([Packet.A_OKAY, Packet.A_OKAY]);
    expect(written[1].readUInt32LE(12)).to.equal(0);
  });
});

// adb's INITIAL_DELAYED_ACK_BYTES: the credit we give a delayed_ack client.
const WINDOW = 32 * 1024 * 1024;
const wrte = (bytes: number) => new Packet(Packet.A_WRTE, 7, 1, bytes, 0, 0, Buffer.alloc(bytes));

describe('TcpUsb Service write past what the client may send', function () {
  it('should limit by packets when the A_OPEN turned delayed acks off', async function () {
    const { service, pending, commands, settle } = opened(true, 0);
    await settle();
    await service.handle(wrte(4));
    await service.handle(wrte(4));
    expect(pending).to.have.length(1);
    expect(commands()).to.deep.equal([Packet.A_OKAY, Packet.A_CLSE]);
  });

  it('should close the stream on a second write before our A_OKAY without delayed_ack', async function () {
    const { service, pending, commands } = setup(false);
    await service.handle(wrte(4));
    await service.handle(wrte(4));
    expect(pending).to.have.length(1);
    expect(commands()).to.deep.equal([Packet.A_CLSE]);

    pending[0]();
    expect(commands()).to.deep.equal([Packet.A_CLSE]);
  });

  it('should take the next write once the last one was acked without delayed_ack', async function () {
    const { service, pending, commands } = setup(false);
    await service.handle(wrte(4));
    pending[0]();
    await service.handle(wrte(4));
    expect(pending).to.have.length(2);
    expect(commands()).to.deep.equal([Packet.A_OKAY]);
  });

  it('should take up to the credit and one more payload with delayed_ack', async function () {
    const { service, pending, commands } = setup(true);
    await service.handle(wrte(WINDOW));
    await service.handle(wrte(4096));
    expect(pending).to.have.length(2);
    expect(commands()).to.deep.equal([]);

    await service.handle(wrte(1));
    expect(pending).to.have.length(2);
    expect(commands()).to.deep.equal([Packet.A_CLSE]);
  });

  it('should give the credit back once the bytes are written with delayed_ack', async function () {
    const { service, pending, commands } = setup(true);
    await service.handle(wrte(WINDOW));
    pending[0]();
    await service.handle(wrte(WINDOW));
    expect(pending).to.have.length(2);
    expect(commands()).to.deep.equal([Packet.A_OKAY]);
  });
});
