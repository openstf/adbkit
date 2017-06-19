const Stream = require('stream');
const Sinon = require('sinon');
const Chai = require('chai');
Chai.use(require('sinon-chai'));
const {expect} = Chai;

const MockConnection = require('../../../mock/connection');
const Protocol = require('../../../../src/adb/protocol');
const TcpIpCommand = require('../../../../src/adb/command/host-transport/tcpip');

describe('TcpIpCommand', function() {

  it("should send 'tcp:<port>'", function(done) {
    const conn = new MockConnection;
    const cmd = new TcpIpCommand(conn);
    conn.socket.on('write', chunk =>
      expect(chunk.toString()).to.equal( 
        Protocol.encodeData('tcpip:5555').toString())
    );
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead("restarting in TCP mode port: 5555\n");
      return conn.socket.causeEnd();
    });
    return cmd.execute(5555)
      .then(() => done());
  });

  it("should resolve with the port", function(done) {
    const conn = new MockConnection;
    const cmd = new TcpIpCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead("restarting in TCP mode port: 5555\n");
      return conn.socket.causeEnd();
    });
    return cmd.execute(5555)
      .then(function(port) {
        expect(port).to.equal(5555);
        return done();
    });
  });

  return it("should reject on unexpected reply", function(done) {
    const conn = new MockConnection;
    const cmd = new TcpIpCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead("not sure what this could be\n");
      return conn.socket.causeEnd();
    });
    return cmd.execute(5555)
      .catch(function(err) {
        expect(err.message).to.eql('not sure what this could be');
        return done();
    });
  });
});
