var Chai, InstallCommand, MockConnection, Protocol, Sinon, Stream, expect;

Stream = require('stream');

Sinon = require('sinon');

Chai = require('chai');

Chai.use(require('sinon-chai'));

expect = Chai.expect;

MockConnection = require('../../../mock/connection');

Protocol = require('../../../../src/adb/protocol');

InstallCommand = require('../../../../src/adb/command/host-transport/install');

describe('InstallCommand', function() {
  it("should send 'pm install -r <apk>'", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new InstallCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData('shell:pm install -r "foo"').toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('Success\r\n');
      return conn.socket.causeEnd();
    });
    return cmd.execute('foo').then(function() {
      return done();
    });
  });
  it("should succeed when command responds with 'Success'", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new InstallCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('Success\r\n');
      return conn.socket.causeEnd();
    });
    return cmd.execute('foo').then(function() {
      return done();
    });
  });
  it("should reject if command responds with 'Failure [REASON]'", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new InstallCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('Failure [BAR]\r\n');
      return conn.socket.causeEnd();
    });
    return cmd.execute('foo')["catch"](function(err) {
      return done();
    });
  });
  it("should give detailed reason in rejection's code property", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new InstallCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('Failure [ALREADY_EXISTS]\r\n');
      return conn.socket.causeEnd();
    });
    return cmd.execute('foo')["catch"](function(err) {
      expect(err.code).to.equal('ALREADY_EXISTS');
      return done();
    });
  });
  return it("should ignore any other data", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new InstallCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('open: Permission failed\r\n');
      conn.socket.causeRead('Success\r\n');
      return conn.socket.causeEnd();
    });
    return cmd.execute('foo').then(function() {
      return done();
    });
  });
});
