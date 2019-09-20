var Chai, DisconnectCommand, MockConnection, Protocol, Sinon, Stream, expect;

Stream = require('stream');

Sinon = require('sinon');

Chai = require('chai');

Chai.use(require('sinon-chai'));

expect = Chai.expect;

MockConnection = require('../../../mock/connection');

Protocol = require('../../../../src/adb/protocol');

DisconnectCommand = require('../../../../src/adb/command/host/disconnect');

describe('DisconnectCommand', function() {
  it("should send 'host:disconnect:<host>:<port>'", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new DisconnectCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData('host:disconnect:192.168.2.2:5555').toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead(Protocol.encodeData(''));
      return conn.socket.causeEnd();
    });
    return cmd.execute('192.168.2.2', 5555).then(function() {
      return done();
    });
  });
  it("should resolve with the new device id if disconnected", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new DisconnectCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead(Protocol.encodeData(''));
      return conn.socket.causeEnd();
    });
    return cmd.execute('192.168.2.2', 5555).then(function(val) {
      expect(val).to.be.equal('192.168.2.2:5555');
      return done();
    });
  });
  return it("should reject with error if unable to disconnect", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new DisconnectCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead(Protocol.encodeData('No such device 192.168.2.2:5555'));
      return conn.socket.causeEnd();
    });
    return cmd.execute('192.168.2.2', 5555)["catch"](function(err) {
      expect(err.message).to.eql('No such device 192.168.2.2:5555');
      return done();
    });
  });
});
