/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const Stream = require('stream');
const Sinon = require('sinon');
const Chai = require('chai');
Chai.use(require('sinon-chai'));
const {expect} = Chai;

const MockConnection = require('../../../mock/connection');
const Protocol = require('../../../../src/adb/protocol');
const InstallCommand =
  require('../../../../src/adb/command/host-transport/install');

describe('InstallCommand', function() {

  it("should send 'pm install -r <apk>'", function(done) {
    const conn = new MockConnection;
    const cmd = new InstallCommand(conn);
    conn.socket.on('write', chunk => expect(chunk.toString()).to.equal( 
      Protocol.encodeData('shell:pm install -r "foo"').toString()));
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('Success\r\n');
      return conn.socket.causeEnd();
    });
    return cmd.execute('foo')
      .then(() => done());
  });

  it("should succeed when command responds with 'Success'", function(done) {
    const conn = new MockConnection;
    const cmd = new InstallCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('Success\r\n');
      return conn.socket.causeEnd();
    });
    return cmd.execute('foo')
      .then(() => done());
  });

  it("should reject if command responds with 'Failure [REASON]'", function(done) {
    const conn = new MockConnection;
    const cmd = new InstallCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('Failure [BAR]\r\n');
      return conn.socket.causeEnd();
    });
    return cmd.execute('foo')
      .catch(err => done());
  });

  it("should give detailed reason in rejection's code property", function(done) {
    const conn = new MockConnection;
    const cmd = new InstallCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('Failure [ALREADY_EXISTS]\r\n');
      return conn.socket.causeEnd();
    });
    return cmd.execute('foo')
      .catch(function(err) {
        expect(err.code).to.equal('ALREADY_EXISTS');
        return done();
    });
  });

  return it("should ignore any other data", function(done) {
    const conn = new MockConnection;
    const cmd = new InstallCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('open: Permission failed\r\n');
      conn.socket.causeRead('Success\r\n');
      return conn.socket.causeEnd();
    });
    return cmd.execute('foo')
      .then(() => done());
  });
});
