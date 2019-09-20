var Chai, HostVersionCommand, MockConnection, Protocol, Sinon, expect;

Sinon = require('sinon');

Chai = require('chai');

Chai.use(require('sinon-chai'));

expect = Chai.expect;

MockConnection = require('../../../mock/connection');

Protocol = require('../../../../src/adb/protocol');

HostVersionCommand = require('../../../../src/adb/command/host/version');

describe('HostVersionCommand', function() {
  it("should send 'host:version'", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new HostVersionCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData('host:version').toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead(Protocol.encodeData('0000'));
      return conn.socket.causeEnd();
    });
    return cmd.execute().then(function(version) {
      return done();
    });
  });
  it("should resolve with version", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new HostVersionCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead(Protocol.encodeData(0x1234.toString(16)));
      return conn.socket.causeEnd();
    });
    return cmd.execute().then(function(version) {
      expect(version).to.equal(0x1234);
      return done();
    });
  });
  return it("should handle old-style version", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new HostVersionCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(0x1234.toString(16));
      return conn.socket.causeEnd();
    });
    return cmd.execute().then(function(version) {
      expect(version).to.equal(0x1234);
      return done();
    });
  });
});
