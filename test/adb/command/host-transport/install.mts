import Sinon from 'sinon';
import { use, expect } from 'chai';
import simonChai from 'sinon-chai';
use(simonChai);
import MockConnection from '../../../mock/connection.mts';
import ProtocolModule from '../../../../dist/src/adb/protocol.js';
import InstallCommandModule from '../../../../dist/src/adb/command/host-transport/install.js';

const Protocol = ProtocolModule.default;
const InstallCommand = InstallCommandModule.default;

describe('InstallCommand', function () {
  it("should send 'pm install -r <apk>'", function () {
    const conn = new MockConnection();
    const cmd = new InstallCommand(conn);
    conn.getSocket().on('write', function (chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData("shell:pm install -r 'foo'").toString());
    });
    setImmediate(function () {
      conn.getSocket().causeRead(Protocol.OKAY);
      conn.getSocket().causeRead('Success\r\n');
      return conn.getSocket().causeEnd();
    });
    return cmd.execute('foo');
  });
  it("should pass an apk path with '!', quotes and spaces on unchanged", function () {
    const conn = new MockConnection();
    const cmd = new InstallCommand(conn);
    const writes: string[] = [];
    conn.getSocket().on('write', function (chunk) {
      writes.push(chunk.toString());
    });
    setImmediate(function () {
      conn.getSocket().causeRead(Protocol.OKAY);
      conn.getSocket().causeRead('Success\r\n');
      return conn.getSocket().causeEnd();
    });
    return cmd.execute("/data/local/tmp/my app!'s.apk").then(function () {
      expect(writes).to.eql([
        Protocol.encodeData("shell:pm install -r '/data/local/tmp/my app!'\"'\"'s.apk'").toString(),
      ]);
    });
  });
  for (const [options, service] of [
    [undefined, "shell:pm install -r 'foo'"],
    [{}, "shell:pm install -r 'foo'"],
    [{ reinstall: true }, "shell:pm install -r 'foo'"],
    [{ reinstall: false }, "shell:pm install 'foo'"],
    [{ allowDowngrade: true }, "shell:pm install -r -d 'foo'"],
    [{ grantPermissions: true }, "shell:pm install -r -g 'foo'"],
    [{ allowTestPackages: true }, "shell:pm install -r -t 'foo'"],
    [{ allowDowngrade: false, grantPermissions: false, allowTestPackages: false }, "shell:pm install -r 'foo'"],
    [
      { reinstall: false, allowDowngrade: true, grantPermissions: true, allowTestPackages: true },
      "shell:pm install -d -g -t 'foo'",
    ],
    [{ allowDowngrade: true, args: ['--user', '10'] }, "shell:pm install -r -d '--user' '10' 'foo'"],
    [{ args: [] }, "shell:pm install -r 'foo'"],
    // Each arg stays one argument, single-quoted, so the shell expands
    // nothing in it and passes '!' and '\\' on unchanged.
    [
      { args: ['a b', '$(reboot)', '`id`', 'x"; reboot; "', '\\', "it's", 'wow!'] },
      "shell:pm install -r 'a b' '$(reboot)' '`id`' 'x\"; reboot; \"' '\\' 'it'\"'\"'s' 'wow!' 'foo'",
    ],
    // A callback, as the README used to document, or null isn't options.
    [() => undefined, "shell:pm install -r 'foo'"],
    [null, "shell:pm install -r 'foo'"],
  ] as const) {
    it(`should send '${service}' for options ${typeof options === 'function' ? 'function' : JSON.stringify(options)}`, async function () {
      const conn = new MockConnection();
      const cmd = new InstallCommand(conn);
      const writes: string[] = [];
      conn.getSocket().on('write', (chunk) => writes.push(chunk.toString()));
      setImmediate(function () {
        conn.getSocket().causeRead(Protocol.OKAY);
        conn.getSocket().causeRead('Success\r\n');
        return conn.getSocket().causeEnd();
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(await cmd.execute('foo', options as any)).to.be.true;
      expect(writes).to.eql([Protocol.encodeData(service).toString()]);
    });
  }
  for (const [label, options] of [
    ['options as an array', ['-d', '-g']],
    ['args as a string', { args: '--user 10' }],
    ['args as an object', { args: { user: 10 } }],
    ['an args entry that is not a string', { args: ['--user', undefined] }],
    ['an args entry that is a number', { args: ['--user', 10] }],
  ] as const) {
    it(`should reject with a TypeError, send nothing and end the connection for ${label}`, async function () {
      const conn = new MockConnection();
      Sinon.spy(conn, 'end');
      const cmd = new InstallCommand(conn);
      const writes: string[] = [];
      conn.getSocket().on('write', (chunk) => writes.push(chunk.toString()));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = await cmd.execute('foo', options as any).then(
        () => {
          throw new Error('Expected a rejection');
        },
        (e: Error) => e,
      );
      expect(err).to.be.an.instanceOf(TypeError);
      expect(err.message).to.match(/^(Pass the install options|The install option 'args')/);
      expect(writes).to.eql([]);
      expect(conn.end).to.have.been.calledOnce;
    });
  }
  it("should succeed when command responds with 'Success'", function () {
    const conn = new MockConnection();
    const cmd = new InstallCommand(conn);
    setImmediate(function () {
      conn.getSocket().causeRead(Protocol.OKAY);
      conn.getSocket().causeRead('Success\r\n');
      return conn.getSocket().causeEnd();
    });
    return cmd.execute('foo');
  });
  it("should reject if command responds with 'Failure [REASON]'", function (done) {
    const conn = new MockConnection();
    const cmd = new InstallCommand(conn);
    setImmediate(function () {
      conn.getSocket().causeRead(Protocol.OKAY);
      conn.getSocket().causeRead('Failure [BAR]\r\n');
      return conn.getSocket().causeEnd();
    });
    cmd.execute('foo').catch(function () {
      done();
    });
  });
  it("should give detailed reason in rejection's code property", function (done) {
    const conn = new MockConnection();
    const cmd = new InstallCommand(conn);
    setImmediate(function () {
      conn.getSocket().causeRead(Protocol.OKAY);
      conn.getSocket().causeRead('Failure [ALREADY_EXISTS]\r\n');
      return conn.getSocket().causeEnd();
    });
    cmd.execute('foo').catch(function (err) {
      expect(err.code).to.equal('ALREADY_EXISTS');
      done();
    });
  });
  it("should strip the description from the code of 'Failure [REASON: description]'", function (done) {
    const conn = new MockConnection();
    const cmd = new InstallCommand(conn);
    const reason =
      'INSTALL_FAILED_UPDATE_INCOMPATIBLE: Package com.example signatures do not match previously installed version; ignoring!';
    setImmediate(function () {
      conn.getSocket().causeRead(Protocol.OKAY);
      conn.getSocket().causeRead(`Failure [${reason}]\r\n`);
      return conn.getSocket().causeEnd();
    });
    cmd.execute('foo').catch(function (err) {
      expect(err.code).to.equal('INSTALL_FAILED_UPDATE_INCOMPATIBLE');
      expect(err.message).to.equal(`foo could not be installed [${reason}]`);
      done();
    });
  });
  return it('should ignore any other data', function () {
    const conn = new MockConnection();
    const cmd = new InstallCommand(conn);
    setImmediate(function () {
      conn.getSocket().causeRead(Protocol.OKAY);
      conn.getSocket().causeRead('open: Permission failed\r\n');
      conn.getSocket().causeRead('Success\r\n');
      return conn.getSocket().causeEnd();
    });
    return cmd.execute('foo');
  });
});
