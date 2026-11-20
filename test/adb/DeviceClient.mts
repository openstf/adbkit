import Stream from 'stream';
import net from 'net';
import { getEventListeners } from 'events';
import Sinon from 'sinon';
import { use, expect } from 'chai';
import simonChai from 'sinon-chai';
use(simonChai);
import MockConnection from '../mock/connection.mts';
import ProtocolModule from '../../dist/src/adb/protocol.js';
import DeviceClientModule from '../../dist/src/adb/DeviceClient.js';
import ParserModule from '../../dist/src/adb/parser.js';
import SyncModule from '../../dist/src/adb/sync.js';
import ClientModule from '../../dist/src/adb/client.js';

const Protocol = ProtocolModule.default;
const DeviceClient = DeviceClientModule.default;
const Parser = ParserModule.default;
const Sync = SyncModule.default;
const Client = ClientModule.default;

describe('DeviceClient', function () {
  const setup = () => {
    const conn = new MockConnection();
    Sinon.spy(conn, 'end');
    Sinon.spy(conn, 'destroy');
    const client = { connection: Sinon.stub().resolves(conn) };
    const device = new DeviceClient(client, 'abba');
    Sinon.stub(device, 'transport').resolves(conn);
    return { conn, client, device };
  };
  // Feeds the replies to the mock socket, one per tick.
  const answer = (conn: MockConnection, ...replies: string[]) => {
    const next = () => {
      const reply = replies.shift();
      if (reply !== undefined) {
        conn.getSocket().causeRead(reply);
        setImmediate(next);
      }
    };
    setImmediate(next);
  };
  const rejected = (promise: Promise<unknown>) =>
    promise.then(
      () => {
        throw new Error('Expected a rejection');
      },
      (err) => err,
    );

  for (const method of ['waitBootComplete', 'waitForDevice']) {
    describe(`${method}({ signal })`, function () {
      it('should reject with the reason without connecting when already aborted', function () {
        const ctx = setup();
        const controller = new AbortController();
        const reason = new Error('aborted early');
        controller.abort(reason);
        return rejected(ctx.device[method]({ signal: controller.signal })).then((err) => {
          expect(err).to.equal(reason);
          expect(ctx.client.connection).to.not.have.been.called;
        });
      });
      it('should reject with the reason, close the connection and drop its listener when aborted', function () {
        const ctx = setup();
        const controller = new AbortController();
        const reason = new Error('aborted');
        const promise = ctx.device[method]({ signal: controller.signal });
        setImmediate(() => {
          ctx.conn.getSocket().causeRead(Protocol.OKAY);
          setImmediate(() => controller.abort(reason));
        });
        return rejected(promise).then((err) => {
          expect(err).to.equal(reason);
          expect(ctx.conn.destroy).to.have.been.called;
          expect(ctx.conn.getSocket().destroyed).to.be.true;
          expect(getEventListeners(controller.signal, 'abort')).to.have.length(0);
        });
      });
      it('should reject with a TimeoutError for AbortSignal.timeout()', function () {
        const ctx = setup();
        return rejected(ctx.device[method]({ signal: AbortSignal.timeout(10) })).then((err) => {
          expect(err.name).to.equal('TimeoutError');
          expect(ctx.conn.destroy).to.have.been.called;
        });
      });
      it('should treat null options like no options', function () {
        const ctx = setup();
        // A wait that never finishes: only the call itself must not throw.
        const promise = ctx.device[method](null);
        expect(promise).to.be.an.instanceof(Promise);
        promise.catch(() => undefined);
        ctx.conn.destroy();
      });
    });
  }

  it('should select the transport on its own connection, then drop the abort listener once the wait succeeds', function () {
    const ctx = setup();
    const writes: string[] = [];
    ctx.conn.getSocket().on('write', (chunk) => writes.push(chunk.toString()));
    const controller = new AbortController();
    answer(ctx.conn, Protocol.OKAY, Protocol.OKAY, '1\n');
    setImmediate(() => setImmediate(() => setImmediate(() => setImmediate(() => ctx.conn.getSocket().causeEnd()))));
    return ctx.device.waitBootComplete({ signal: controller.signal }).then((result) => {
      expect(result).to.be.true;
      expect(writes[0]).to.equal(Protocol.encodeData('host:transport:abba').toString());
      expect(ctx.device.transport).to.not.have.been.called;
      expect(getEventListeners(controller.signal, 'abort')).to.have.length(0);
    });
  });
  describe('abort while stalled', function () {
    it('should reject at once and destroy the socket while host:transport gets no answer', async function () {
      const ctx = setup();
      const controller = new AbortController();
      const reason = new Error('boot timeout');
      const promise = ctx.device.waitBootComplete({ signal: controller.signal });
      setImmediate(() => controller.abort(reason));
      expect(await rejected(promise)).to.equal(reason);
      expect(ctx.conn.destroy).to.have.been.called;
      expect(ctx.conn.getSocket().destroyed).to.be.true;
    });
    it('should reject at once while still connecting, and close the late connection', async function () {
      const conn = new MockConnection();
      Sinon.spy(conn, 'destroy');
      let connected: (c: unknown) => void = () => undefined;
      const client = { connection: () => new Promise((resolve) => (connected = resolve)) };
      const device = new DeviceClient(client, 'abba');
      const controller = new AbortController();
      const reason = new Error('gave up');
      const promise = device.waitForDevice({ signal: controller.signal });
      controller.abort(reason);
      expect(await rejected(promise)).to.equal(reason);
      connected(conn);
      await new Promise((resolve) => setImmediate(resolve));
      expect(conn.destroy).to.have.been.called;
    });
  });

  describe('abort against a server that never answers', function () {
    // A real socket to a fake ADB server that reads the request and then
    // stalls, to check that an abort really closes the connection.
    const stalledServer = async () => {
      const received: string[] = [];
      let serverSocket: net.Socket | undefined;
      let requested: () => void = () => undefined;
      const request = new Promise<void>((resolve) => (requested = resolve));
      const server = net.createServer((socket) => {
        serverSocket = socket;
        socket.on('data', (chunk) => {
          received.push(chunk.toString());
          requested();
        });
      });
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      const { port } = server.address() as net.AddressInfo;
      const closed = () => new Promise((resolve) => serverSocket!.once('close', resolve));
      // Also drops a socket the client failed to close, so mocha can exit.
      const stop = () => {
        serverSocket?.destroy();
        server.close();
      };
      return { port, received, request, closed, stop };
    };

    for (const [method, args, query] of [
      ['shell', ['echo'], 'host:transport:abba'],
      ['waitBootComplete', [], 'host:transport:abba'],
      ['waitForDevice', [], 'host-serial:abba:wait-for-any-device'],
    ] as const) {
      it(`should close the socket when ${method}() is aborted while waiting for '${query}'`, async function () {
        const fake = await stalledServer();
        try {
          const device = new Client({ host: '127.0.0.1', port: fake.port }).getDevice('abba');
          const controller = new AbortController();
          const reason = new Error('stalled');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const promise = (device[method] as any)(...args, { signal: controller.signal });
          await fake.request;
          expect(fake.received.join('')).to.equal(Protocol.encodeData(query).toString());
          const closed = fake.closed();
          controller.abort(reason);
          expect(await rejected(promise)).to.equal(reason);
          await closed;
        } finally {
          fake.stop();
        }
      });
    }
  });

  describe('shell(command, { signal })', function () {
    // host:transport, then shell:
    const okay = (ctx: ReturnType<typeof setup>) => answer(ctx.conn, Protocol.OKAY, Protocol.OKAY);

    it('should reject with the reason without connecting when already aborted', async function () {
      const ctx = setup();
      const controller = new AbortController();
      const reason = new Error('aborted early');
      controller.abort(reason);
      expect(await rejected(ctx.device.shell('echo', { signal: controller.signal }))).to.equal(reason);
      expect(ctx.client.connection).to.not.have.been.called;
    });
    it('should reject with the reason and close the connection when aborted before ADB answers', async function () {
      const ctx = setup();
      const controller = new AbortController();
      const reason = new Error('aborted');
      const promise = ctx.device.shell('echo', { signal: controller.signal });
      setImmediate(() => controller.abort(reason));
      expect(await rejected(promise)).to.equal(reason);
      expect(ctx.conn.destroy).to.have.been.called;
      expect(getEventListeners(controller.signal, 'abort')).to.have.length(0);
    });
    it('should destroy the stream with the reason when aborted while the command runs', async function () {
      const ctx = setup();
      const controller = new AbortController();
      const reason = new Error('stuck');
      okay(ctx);
      const stream = await ctx.device.shell('logcat', { signal: controller.signal });
      ctx.conn.getSocket().causeRead('partial output\n');
      const output = new Parser(stream).readAll();
      const closed = new Promise((resolve) => stream.once('close', resolve));
      controller.abort(reason);
      expect(await rejected(output)).to.equal(reason);
      await closed;
      expect(stream.destroyed).to.be.true;
      expect(getEventListeners(controller.signal, 'abort')).to.have.length(0);
    });
    it('should not crash when aborted while nobody reads the stream', async function () {
      const ctx = setup();
      const controller = new AbortController();
      okay(ctx);
      const stream = await ctx.device.shell('logcat', { signal: controller.signal });
      const closed = new Promise((resolve) => stream.once('close', resolve));
      controller.abort(new Error('stuck'));
      await closed;
      expect(stream.destroyed).to.be.true;
    });
    it('should drop the abort listener once the output ends, without waiting for close', async function () {
      const ctx = setup();
      const controller = new AbortController();
      okay(ctx);
      const stream = await ctx.device.shell('echo foo', { signal: controller.signal });
      expect(getEventListeners(controller.signal, 'abort')).to.have.length(1);
      ctx.conn.getSocket().causeRead('foo\n');
      ctx.conn.getSocket().causeEnd();
      expect((await new Parser(stream).readAll()).toString()).to.equal('foo\n');
      // The mock is half-open, so it doesn't close after 'end'.
      expect(stream.destroyed).to.be.false;
      expect(getEventListeners(controller.signal, 'abort')).to.have.length(0);
    });
    it('should not collect listeners on a signal shared by many calls', async function () {
      const controller = new AbortController();
      const conns: MockConnection[] = [];
      const client = {
        connection: () => {
          const conn = new MockConnection();
          conns.push(conn);
          answer(conn, Protocol.OKAY, Protocol.OKAY);
          return Promise.resolve(conn);
        },
      };
      const device = new DeviceClient(client, 'abba');
      const warnings: Error[] = [];
      const onWarning = (warning: Error) => warnings.push(warning);
      process.on('warning', onWarning);
      try {
        for (let i = 0; i < 25; i += 1) {
          const stream = await device.shell('input tap 1 1', { signal: controller.signal });
          conns[i].getSocket().causeEnd();
          await new Parser(stream).readAll();
        }
        await new Promise((resolve) => setImmediate(resolve));
      } finally {
        process.removeListener('warning', onWarning);
      }
      expect(getEventListeners(controller.signal, 'abort')).to.have.length(0);
      expect(warnings.filter((w) => w.name === 'MaxListenersExceededWarning')).to.have.length(0);
    });
    it('should still abort the command after the caller ends its side', async function () {
      const ctx = setup();
      const controller = new AbortController();
      const reason = new Error('aborted');
      okay(ctx);
      const stream = await ctx.device.shell('cat', { signal: controller.signal });
      stream.on('error', () => undefined);
      await new Promise((resolve) => stream.end(resolve));
      expect(getEventListeners(controller.signal, 'abort')).to.have.length(1);
      controller.abort(reason);
      expect(stream.destroyed).to.be.true;
      expect(getEventListeners(controller.signal, 'abort')).to.have.length(0);
    });
    for (const [label, options] of [
      ['without options', []],
      ['with null options', [null]],
      ['with a callback, as 2.x took', [() => undefined]],
    ] as const) {
      it(`should work as before ${label}`, async function () {
        const ctx = setup();
        const writes: string[] = [];
        ctx.conn.getSocket().on('write', (chunk) => writes.push(chunk.toString()));
        okay(ctx);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stream = await ctx.device.shell(['echo', 'foo'], ...(options as any[]));
        ctx.conn.getSocket().causeRead('foo\n');
        ctx.conn.getSocket().causeEnd();
        expect((await new Parser(stream).readAll()).toString()).to.equal('foo\n');
        expect(writes).to.eql([
          Protocol.encodeData('host:transport:abba').toString(),
          Protocol.encodeData("shell:'echo' 'foo'").toString(),
        ]);
      });
    }
  });

  describe('reboot([target])', function () {
    for (const [args, service] of [
      [[], 'reboot:'],
      [['recovery'], 'reboot:recovery'],
      [[undefined], 'reboot:'],
      // A callback, as the README used to document, isn't a target.
      [[() => undefined], 'reboot:'],
    ] as const) {
      it(`should send '${service}' for reboot(${args.map((a) => (typeof a === 'string' ? `'${a}'` : typeof a)).join()})`, async function () {
        const { conn, device } = setup();
        const writes: string[] = [];
        conn.getSocket().on('write', (chunk) => writes.push(chunk.toString()));
        setImmediate(() => {
          conn.getSocket().causeRead(Protocol.OKAY);
          conn.getSocket().causeEnd();
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(await device.reboot(...(args as any[]))).to.be.true;
        expect(writes).to.eql([Protocol.encodeData(service).toString()]);
      });
    }
  });

  describe('install(apk[, options])', function () {
    for (const args of [[], [{ allowDowngrade: true, grantPermissions: true }], [() => undefined]]) {
      it(`should hand ${args.length ? typeof args[0] : 'no options'} to installRemote()`, async function () {
        const { device } = setup();
        const transfer = new Stream.PassThrough();
        Sinon.stub(device, 'push').resolves(transfer);
        const installRemote = Sinon.stub(device, 'installRemote').resolves(true);
        setImmediate(() => transfer.emit('end'));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(await device.install('foo.apk', ...(args as any[]))).to.be.true;
        expect(installRemote).to.have.been.calledOnceWithExactly(Sync.temp('foo.apk'), args[0]);
      });
    }
  });

  describe('installRemote(apk[, options])', function () {
    for (const [args, service] of [
      [[], 'shell:pm install -r "/data/local/tmp/foo.apk"'],
      [[{ allowDowngrade: true, grantPermissions: true }], 'shell:pm install -r -d -g "/data/local/tmp/foo.apk"'],
      // A callback, as the README used to document, isn't options.
      [[() => undefined], 'shell:pm install -r "/data/local/tmp/foo.apk"'],
    ] as const) {
      it(`should send '${service}' and remove the apk`, async function () {
        const { conn, device } = setup();
        const writes: string[] = [];
        conn.getSocket().on('write', (chunk) => writes.push(chunk.toString()));
        const rm = new Stream.PassThrough();
        rm.end();
        const shell = Sinon.stub(device, 'shell').resolves(rm);
        answer(conn, Protocol.OKAY, 'Success\r\n');
        setImmediate(() => setImmediate(() => setImmediate(() => conn.getSocket().causeEnd())));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(await device.installRemote('/data/local/tmp/foo.apk', ...(args as any[]))).to.be.true;
        expect(writes).to.eql([Protocol.encodeData(service).toString()]);
        expect(shell).to.have.been.calledOnceWithExactly(['rm', '-f', '/data/local/tmp/foo.apk']);
      });
    }
  });

  describe('installRemote(apk, bad options)', function () {
    it('should reject with a TypeError, still remove the apk and end the connection', async function () {
      const { conn, device } = setup();
      const writes: string[] = [];
      conn.getSocket().on('write', (chunk) => writes.push(chunk.toString()));
      const rm = new Stream.PassThrough();
      rm.end();
      const shell = Sinon.stub(device, 'shell').resolves(rm);
      const bad = { args: ['--user', undefined] } as never;
      const err = await rejected(device.installRemote('/data/local/tmp/foo.apk', bad));
      expect(err).to.be.an.instanceOf(TypeError);
      expect(writes).to.eql([]);
      expect(conn.end).to.have.been.called;
      expect(shell).to.have.been.calledOnceWithExactly(['rm', '-f', '/data/local/tmp/foo.apk']);
    });
  });

  describe('startService(options)', function () {
    it('should retry once without --user when the device rejects the option', async function () {
      const device = new DeviceClient({ connection: Sinon.stub() }, 'abba');
      const writes: string[] = [];
      const conns = [0, 1, 2].map(() => {
        const conn = new MockConnection();
        conn.getSocket().on('write', (chunk) => writes.push(chunk.toString()));
        return conn;
      });
      const transport = Sinon.stub(device, 'transport');
      conns.forEach((conn, i) => transport.onCall(i).resolves(conn));
      const answer = (conn: MockConnection, output: string) =>
        setImmediate(() => {
          conn.getSocket().causeRead(Protocol.OKAY);
          conn.getSocket().causeRead(output);
          conn.getSocket().causeEnd();
        });
      answer(conns[0], 'Error: Unknown option: --user\n');
      transport.onCall(1).callsFake(() => {
        answer(conns[1], 'Starting service: Intent { cmp=a/.B }\n');
        return Promise.resolve(conns[1]);
      });
      expect(await device.startService({ component: 'a/.B' })).to.be.true;
      expect(transport).to.have.been.calledTwice;
      expect(writes[0]).to.contain('--user 0');
      expect(writes[1]).to.not.contain('--user');
    });
  });

  describe('removeAllForwards()', function () {
    const forwards = [
      { serial: 'abba', local: 'tcp:1', remote: 'tcp:2' },
      { serial: 'other', local: 'tcp:3', remote: 'tcp:4' },
      { serial: 'abba', local: 'localabstract:x', remote: 'tcp:5' },
    ];

    it("should remove only this device's forwards, one by one", async function () {
      const device = new DeviceClient({ connection: Sinon.stub() }, 'abba');
      Sinon.stub(device, 'listForwards').resolves(forwards);
      const removeForward = Sinon.stub(device, 'removeForward').resolves(true);
      expect(await device.removeAllForwards()).to.be.true;
      expect(removeForward.args).to.deep.equal([['tcp:1'], ['localabstract:x']]);
    });
    it('should skip a forward that disappeared after it was listed', async function () {
      const device = new DeviceClient({ connection: Sinon.stub() }, 'abba');
      Sinon.stub(device, 'listForwards').resolves(forwards);
      const removeForward = Sinon.stub(device, 'removeForward');
      removeForward.onFirstCall().rejects(new Parser.FailError("listener 'tcp:1' not found"));
      removeForward.onSecondCall().resolves(true);
      expect(await device.removeAllForwards()).to.be.true;
      expect(removeForward).to.have.been.calledTwice;
    });
    it('should reject on any other error', async function () {
      const device = new DeviceClient({ connection: Sinon.stub() }, 'abba');
      Sinon.stub(device, 'listForwards').resolves(forwards);
      const failure = new Error('boom');
      Sinon.stub(device, 'removeForward').rejects(failure);
      expect(await rejected(device.removeAllForwards())).to.equal(failure);
    });
  });

  describe('push(contents, path)', function () {
    const push = async (reply: Buffer) => {
      const conn = new MockConnection();
      const sync = new Sync(conn);
      Sinon.spy(sync, 'end');
      const device = new DeviceClient({ connection: Sinon.stub() }, 'abba');
      Sinon.stub(device, 'syncService').resolves(sync);
      const stream = new Stream.PassThrough();
      const transfer = await device.push(stream, '/foo');
      const closed = new Promise((resolve) => transfer.on('close', resolve));
      transfer.on('error', () => undefined);
      stream.end(Buffer.alloc(10));
      setTimeout(() => conn.getSocket().causeRead(reply), 10);
      await closed;
      return sync;
    };
    it('should end the sync connection when the push succeeds', async function () {
      const sync = await push(Buffer.concat([Buffer.from(Protocol.OKAY), Buffer.alloc(4)]));
      expect(sync.end).to.have.been.calledOnce;
    });
    it('should end the sync connection when the push fails', async function () {
      const message = Buffer.from('Read-only file system');
      const length = Buffer.alloc(4);
      length.writeUInt32LE(message.length, 0);
      const sync = await push(Buffer.concat([Buffer.from(Protocol.FAIL), length, message]));
      expect(sync.end).to.have.been.calledOnce;
    });
  });

  describe('pull(path)', function () {
    const pull = async (reply: Buffer) => {
      const conn = new MockConnection();
      const sync = new Sync(conn);
      Sinon.spy(sync, 'end');
      const device = new DeviceClient({ connection: Sinon.stub() }, 'abba');
      Sinon.stub(device, 'syncService').resolves(sync);
      const transfer = await device.pull('/foo');
      const closed = new Promise((resolve) => transfer.on('close', resolve));
      transfer.on('error', () => undefined);
      transfer.resume();
      conn.getSocket().causeRead(reply);
      await closed;
      return sync;
    };
    it('should end the sync connection when the pull succeeds', async function () {
      const sync = await pull(Buffer.concat([Buffer.from(Protocol.DONE), Buffer.alloc(4)]));
      expect(sync.end).to.have.been.calledOnce;
    });
    it('should end the sync connection when the pull fails', async function () {
      const message = Buffer.from('open failed: Permission denied');
      const length = Buffer.alloc(4);
      length.writeUInt32LE(message.length, 0);
      const sync = await pull(Buffer.concat([Buffer.from(Protocol.FAIL), length, message]));
      expect(sync.end).to.have.been.calledOnce;
    });
  });
});
