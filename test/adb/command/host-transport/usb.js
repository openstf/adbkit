var Chai, MockConnection, Protocol, Sinon, Stream, UsbCommand, expect;

Stream = require('stream');

Sinon = require('sinon');

Chai = require('chai');

Chai.use(require('sinon-chai'));

expect = Chai.expect;

MockConnection = require('../../../mock/connection');

Protocol = require('../../../../src/adb/protocol');

UsbCommand = require('../../../../src/adb/command/host-transport/usb');

describe('UsbCommand', function() {
  it("should send 'usb:'", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new UsbCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData('usb:').toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead("restarting in USB mode\n");
      return conn.socket.causeEnd();
    });
    return cmd.execute().then(function(val) {
      expect(val).to.be["true"];
      return done();
    });
  });
  return it("should reject on unexpected reply", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new UsbCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead("invalid port\n");
      return conn.socket.causeEnd();
    });
    return cmd.execute()["catch"](function(err) {
      expect(err.message).to.eql('invalid port');
      return done();
    });
  });
});
