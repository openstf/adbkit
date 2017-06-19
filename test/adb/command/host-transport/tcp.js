const Stream = require('stream');
const Sinon = require('sinon');
const Chai = require('chai');
Chai.use(require('sinon-chai'));
const {expect} = Chai;

const MockConnection = require('../../../mock/connection');
const Protocol = require('../../../../src/adb/protocol');
const TcpCommand = require('../../../../src/adb/command/host-transport/tcp');

describe('TcpCommand', function() {

  it("should send 'tcp:<port>' when no host given", function(done) {
    const conn = new MockConnection;
    const cmd = new TcpCommand(conn);
    conn.socket.on('write', chunk =>
      expect(chunk.toString()).to.equal( 
        Protocol.encodeData('tcp:8080').toString())
    );
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      return conn.socket.causeEnd();
    });
    return cmd.execute(8080)
      .then(stream => done());
  });

  it("should send 'tcp:<port>:<host>' when host given", function(done) {
    const conn = new MockConnection;
    const cmd = new TcpCommand(conn);
    conn.socket.on('write', chunk =>
      expect(chunk.toString()).to.equal( 
        Protocol.encodeData('tcp:8080:127.0.0.1').toString())
    );
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      return conn.socket.causeEnd();
    });
    return cmd.execute(8080, '127.0.0.1')
      .then(stream => done());
  });

  return it("should resolve with the tcp stream", function(done) {
    const conn = new MockConnection;
    const cmd = new TcpCommand(conn);
    setImmediate(() => conn.socket.causeRead(Protocol.OKAY));
    return cmd.execute(8080)
      .then(function(stream) {
        stream.end();
        expect(stream).to.be.an.instanceof(Stream.Readable);
        return done();
    });
  });
});
