var Chai, MockConnection, Protocol, Sinon, Stream, WaitForDeviceCommand, expect;

Stream = require('stream');

Sinon = require('sinon');

Chai = require('chai');

Chai.use(require('sinon-chai'));

expect = Chai.expect;

MockConnection = require('../../../mock/connection');

Protocol = require('../../../../src/adb/protocol');

WaitForDeviceCommand = require('../../../../src/adb/command/host-serial/waitfordevice');

describe('WaitForDeviceCommand', function() {
  it("should send 'host-serial:<serial>:wait-for-any'", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new WaitForDeviceCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData('host-serial:abba:wait-for-any').toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead(Protocol.OKAY);
      return conn.socket.causeEnd();
    });
    return cmd.execute('abba').then(function() {
      return done();
    });
  });
  it("should resolve with id when the device is connected", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new WaitForDeviceCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead(Protocol.OKAY);
      return conn.socket.causeEnd();
    });
    return cmd.execute('abba').then(function(id) {
      expect(id).to.equal('abba');
      return done();
    });
  });
  return it("should reject with error if unable to connect", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new WaitForDeviceCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead(Protocol.FAIL);
      conn.socket.causeRead(Protocol.encodeData('not sure how this might happen'));
      return conn.socket.causeEnd();
    });
    return cmd.execute('abba')["catch"](function(err) {
      expect(err.message).to.contain('not sure how this might happen');
      return done();
    });
  });
});
