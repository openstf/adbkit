var Chai, IsInstalledCommand, MockConnection, Protocol, Sinon, Stream, expect;

Stream = require('stream');

Sinon = require('sinon');

Chai = require('chai');

Chai.use(require('sinon-chai'));

expect = Chai.expect;

MockConnection = require('../../../mock/connection');

Protocol = require('../../../../src/adb/protocol');

IsInstalledCommand = require('../../../../src/adb/command/host-transport/isinstalled');

describe('IsInstalledCommand', function() {
  it("should send 'pm path <pkg>'", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new IsInstalledCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData("shell:pm path foo 2>/dev/null").toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('package:foo\r\n');
      return conn.socket.causeEnd();
    });
    return cmd.execute('foo').then(function() {
      return done();
    });
  });
  it("should resolve with true if package returned by command", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new IsInstalledCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('package:bar\r\n');
      return conn.socket.causeEnd();
    });
    return cmd.execute('foo').then(function(found) {
      expect(found).to.be["true"];
      return done();
    });
  });
  it("should resolve with false if no package returned", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new IsInstalledCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      return conn.socket.causeEnd();
    });
    return cmd.execute('foo').then(function(found) {
      expect(found).to.be["false"];
      return done();
    });
  });
  return it("should fail if any other data is received", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new IsInstalledCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('open: Permission failed\r\n');
      return conn.socket.causeEnd();
    });
    return cmd.execute('foo')["catch"](function(err) {
      expect(err).to.be.an["instanceof"](Error);
      return done();
    });
  });
});
