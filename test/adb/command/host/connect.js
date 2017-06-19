const Stream = require('stream');
const Sinon = require('sinon');
const Chai = require('chai');
Chai.use(require('sinon-chai'));
const {expect} = Chai;

const MockConnection = require('../../../mock/connection');
const Protocol = require('../../../../src/adb/protocol');
const ConnectCommand = require('../../../../src/adb/command/host/connect');

describe('ConnectCommand', function() {

  it("should send 'host:connect:<host>:<port>'", function(done) {
    const conn = new MockConnection;
    const cmd = new ConnectCommand(conn);
    conn.socket.on('write', chunk =>
      expect(chunk.toString()).to.equal( 
        Protocol.encodeData('host:connect:192.168.2.2:5555').toString())
    );
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead(Protocol.encodeData('connected to 192.168.2.2:5555'));
      return conn.socket.causeEnd();
    });
    return cmd.execute('192.168.2.2', 5555)
      .then(() => done());
  });

  it("should resolve with the new device id if connected", function(done) {
    const conn = new MockConnection;
    const cmd = new ConnectCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead(Protocol.encodeData('connected to 192.168.2.2:5555'));
      return conn.socket.causeEnd();
    });
    return cmd.execute('192.168.2.2', 5555)
      .then(function(val) {
        expect(val).to.be.equal('192.168.2.2:5555');
        return done();
    });
  });

  it("should resolve with the new device id if already connected", function(done) {
    const conn = new MockConnection;
    const cmd = new ConnectCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead( 
        Protocol.encodeData('already connected to 192.168.2.2:5555'));
      return conn.socket.causeEnd();
    });
    return cmd.execute('192.168.2.2', 5555)
      .then(function(val) {
        expect(val).to.be.equal('192.168.2.2:5555');
        return done();
    });
  });

  return it("should reject with error if unable to connect", function(done) {
    const conn = new MockConnection;
    const cmd = new ConnectCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead( 
        Protocol.encodeData('unable to connect to 192.168.2.2:5555'));
      return conn.socket.causeEnd();
    });
    return cmd.execute('192.168.2.2', 5555)
      .catch(function(err) {
        expect(err.message).to.eql('unable to connect to 192.168.2.2:5555');
        return done();
    });
  });
});
