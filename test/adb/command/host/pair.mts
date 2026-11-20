import Sinon from 'sinon';
import debug from 'debug';
import { use, expect } from 'chai';
import simonChai from 'sinon-chai';
use(simonChai);
import MockConnection from '../../../mock/connection.mts';
import ProtocolModule from '../../../../dist/src/adb/protocol.js';
import ParserModule from '../../../../dist/src/adb/parser.js';
import PairCommandModule from '../../../../dist/src/adb/command/host/pair.js';
import ClientModule from '../../../../dist/src/adb/client.js';

const Protocol = ProtocolModule.default;
const Parser = ParserModule.default;
const PairCommand = PairCommandModule.default;
const Client = ClientModule.default;

describe('PairCommand', function () {
  const rejected = (promise: Promise<unknown>) =>
    promise.then(
      () => {
        throw new Error('Expected a rejection');
      },
      (err) => err,
    );
  const reply = (conn: MockConnection, ...chunks: (string | Buffer)[]) =>
    setImmediate(() => {
      for (const chunk of chunks) {
        conn.getSocket().causeRead(chunk);
      }
      conn.getSocket().causeEnd();
    });
  const success = 'Successfully paired to 192.168.1.5:37000 [guid=adb-R5CR1234567-AbCdEf]';

  it("should send 'host:pair:<code>:<host>:<port>', keeping a leading zero in the code", async function () {
    const conn = new MockConnection();
    const writes: string[] = [];
    conn.getSocket().on('write', (chunk) => writes.push(chunk.toString()));
    reply(conn, Protocol.OKAY, Protocol.encodeData(success));
    await new PairCommand(conn).execute('192.168.1.5', 37000, '012345');
    expect(writes).to.eql([Protocol.encodeData('host:pair:012345:192.168.1.5:37000').toString()]);
  });
  it('should resolve with the address, the guid and the reply when paired', async function () {
    const conn = new MockConnection();
    reply(conn, Protocol.OKAY, Protocol.encodeData(success));
    expect(await new PairCommand(conn).execute('192.168.1.5', 37000, '123456')).to.eql({
      address: '192.168.1.5:37000',
      guid: 'adb-R5CR1234567-AbCdEf',
      reply: success,
    });
  });
  it('should resolve without a guid when the server reports none', async function () {
    const conn = new MockConnection();
    reply(conn, Protocol.OKAY, Protocol.encodeData('Successfully paired to 192.168.1.5:37000'));
    expect(await new PairCommand(conn).execute('192.168.1.5', 37000, '123456')).to.eql({
      address: '192.168.1.5:37000',
      reply: 'Successfully paired to 192.168.1.5:37000',
    });
  });
  it("should reject with the server's message when the outcome is a FAIL status", async function () {
    // The exact bytes a platform-tools 37 server sends when nothing listens on
    // the pairing port.
    const conn = new MockConnection();
    reply(conn, 'OKAYFAIL0027Failed: Unable to start pairing client.');
    const err = await rejected(new PairCommand(conn).execute('127.0.0.1', 1, '123456'));
    expect(err).to.be.an.instanceof(Parser.FailError);
    expect(err.message).to.equal("Failure: 'Failed: Unable to start pairing client.'");
  });
  it("should reject with FailError when the reply is a 'Failed:' message", async function () {
    const conn = new MockConnection();
    reply(conn, Protocol.OKAY, Protocol.encodeData('Failed: Wrong password or connection was dropped.'));
    const err = await rejected(new PairCommand(conn).execute('192.168.1.5', 37000, '000000'));
    expect(err).to.be.an.instanceof(Parser.FailError);
    expect(err.message).to.equal("Failure: 'Failed: Wrong password or connection was dropped.'");
  });
  it('should reject with FailError when the server refuses the request', async function () {
    // What a server older than platform-tools 30 does.
    const conn = new MockConnection();
    reply(conn, Protocol.FAIL, Protocol.encodeData('unknown host service'));
    const err = await rejected(new PairCommand(conn).execute('192.168.1.5', 37000, '123456'));
    expect(err).to.be.an.instanceof(Parser.FailError);
    expect(err.message).to.equal("Failure: 'unknown host service'");
  });
  it('should also accept a second OKAY before the reply', async function () {
    const conn = new MockConnection();
    reply(conn, Protocol.OKAY, Protocol.OKAY, Protocol.encodeData(success));
    expect((await new PairCommand(conn).execute('192.168.1.5', 37000, '123456')).guid).to.equal(
      'adb-R5CR1234567-AbCdEf',
    );
  });
  it('should reject with UnexpectedDataError on anything else', async function () {
    const conn = new MockConnection();
    reply(conn, Protocol.OKAY, 'WHAT');
    const err = await rejected(new PairCommand(conn).execute('192.168.1.5', 37000, '123456'));
    expect(err).to.be.an.instanceof(Parser.UnexpectedDataError);
  });
  for (const host of ['fe80::1234', '[fe80::1234]']) {
    it(`should put an IPv6 address in brackets (${host})`, async function () {
      const conn = new MockConnection();
      const writes: string[] = [];
      conn.getSocket().on('write', (chunk) => writes.push(chunk.toString()));
      reply(conn, Protocol.OKAY, Protocol.encodeData(success));
      await new PairCommand(conn).execute(host, 37000, '123456');
      expect(writes).to.eql([Protocol.encodeData('host:pair:123456:[fe80::1234]:37000').toString()]);
    });
  }
  for (const [args, message] of [
    [['192.168.1.5', 37000, '12:34'], /without ':'/],
    [['192.168.1.5', 37000, ''], /without ':'/],
    [['192.168.1.5', 37000, 12345], /as a string/],
    [['192.168.1.5', 0, '123456'], /1 to 65535/],
    [['192.168.1.5', 65536, '123456'], /1 to 65535/],
    [['192.168.1.5', 3.5, '123456'], /1 to 65535/],
    [['192.168.1.5:37000', 37000, '123456'], /includes a port/],
    [['[fe80::1]:37000', 37000, '123456'], /includes a port/],
    [['', 37000, '123456'], /Invalid host/],
  ] as const) {
    it(`should reject execute(${args.map((a) => JSON.stringify(a)).join(', ')}) without sending anything`, async function () {
      const conn = new MockConnection();
      const writes: string[] = [];
      conn.getSocket().on('write', (chunk) => writes.push(chunk.toString()));
      Sinon.spy(conn, 'end');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = await rejected(new PairCommand(conn).execute(...(args as [any, any, any])));
      expect(err).to.be.an.instanceof(TypeError);
      expect(err.message).to.match(message);
      expect(writes).to.be.empty;
      expect(conn.end).to.have.been.called;
    });
  }
  it('should end the connection when the reply is cut short', async function () {
    const conn = new MockConnection();
    Sinon.spy(conn, 'end');
    reply(conn, Protocol.OKAY, '00');
    const err = await rejected(new PairCommand(conn).execute('192.168.1.5', 37000, '123456'));
    expect(err).to.be.an.instanceof(Parser.PrematureEOFError);
    expect(conn.end).to.have.been.called;
  });
  it('should not log the pairing code', async function () {
    const lines: string[] = [];
    const log = debug.log;
    const enabled = debug.disable();
    debug.log = (...args: unknown[]) => lines.push(args.join(' '));
    debug.enable('adb:command');
    try {
      const conn = new MockConnection();
      reply(conn, Protocol.OKAY, Protocol.encodeData(success));
      await new PairCommand(conn).execute('192.168.1.5', 37000, '482915');
    } finally {
      debug.log = log;
      debug.disable();
      if (enabled) {
        debug.enable(enabled);
      }
    }
    expect(lines.join('\n')).to.contain('host:pair:******:192.168.1.5:37000');
    expect(lines.join('\n')).to.not.contain('482915');
  });

  describe('client.pair()', function () {
    const setup = () => {
      const conn = new MockConnection();
      const writes: string[] = [];
      conn.getSocket().on('write', (chunk) => writes.push(chunk.toString()));
      const client = new Client();
      const connection = Sinon.stub(client, 'connection').resolves(conn);
      return { conn, writes, client, connection };
    };
    for (const [address, sent] of [
      ['192.168.1.5:37000', '192.168.1.5:37000'],
      ['[fe80::1234]:37000', '[fe80::1234]:37000'],
    ]) {
      it(`should take the address as shown in the dialog, '${address}'`, async function () {
        const { conn, writes, client } = setup();
        reply(conn, Protocol.OKAY, Protocol.encodeData(success));
        await client.pair(address, '012345');
        expect(writes).to.eql([Protocol.encodeData(`host:pair:012345:${sent}`).toString()]);
      });
    }
    it('should take the host and the port apart', async function () {
      const { conn, writes, client } = setup();
      reply(conn, Protocol.OKAY, Protocol.encodeData(success));
      await client.pair('192.168.1.5', 37000, '012345');
      expect(writes).to.eql([Protocol.encodeData('host:pair:012345:192.168.1.5:37000').toString()]);
    });
    for (const args of [
      ['192.168.1.5', '123456'],
      ['192.168.1.5:37000', 123456],
      ['192.168.1.5:37000', 37000],
    ]) {
      it(`should reject pair(${args.map((a) => JSON.stringify(a)).join(', ')}) without connecting`, async function () {
        const { client, connection } = setup();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err = await rejected((client.pair as any)(...args));
        expect(err).to.be.an.instanceof(TypeError);
        expect(connection).to.not.have.been.called;
      });
    }
  });
});
