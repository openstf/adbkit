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
const UsbCommand = require('../../../../src/adb/command/host-transport/usb');

describe('UsbCommand', function() {

  it("should send 'usb:'", function(done) {
    const conn = new MockConnection;
    const cmd = new UsbCommand(conn);
    conn.socket.on('write', chunk => expect(chunk.toString()).to.equal( 
      Protocol.encodeData('usb:').toString()));
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead("restarting in USB mode\n");
      return conn.socket.causeEnd();
    });
    return cmd.execute()
      .then(function(val) {
        expect(val).to.be.true;
        return done();
    });
  });

  return it("should reject on unexpected reply", function(done) {
    const conn = new MockConnection;
    const cmd = new UsbCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead("invalid port\n");
      return conn.socket.causeEnd();
    });
    return cmd.execute()
      .catch(function(err) {
        expect(err.message).to.eql('invalid port');
        return done();
    });
  });
});
