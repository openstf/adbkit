const Stream = require('stream');
const Sinon = require('sinon');
const Chai = require('chai');
Chai.use(require('sinon-chai'));
const {expect} = Chai;

const MockConnection = require('../../../mock/connection');
const Protocol = require('../../../../src/adb/protocol');
const LocalCommand = require('../../../../src/adb/command/host-transport/local');

describe('LocalCommand', function() {

  it("should send 'localfilesystem:<path>'", function(done) {
    const conn = new MockConnection;
    const cmd = new LocalCommand(conn);
    conn.socket.on('write', chunk =>
      expect(chunk.toString()).to.equal( 
        Protocol.encodeData('localfilesystem:/foo.sock').toString())
    );
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      return conn.socket.causeEnd();
    });
    return cmd.execute('/foo.sock')
      .then(stream => done());
  });

  it("should send '<type>:<path>' if <path> prefixed with '<type>:'", function(done) {
    const conn = new MockConnection;
    const cmd = new LocalCommand(conn);
    conn.socket.on('write', chunk =>
      expect(chunk.toString()).to.equal( 
        Protocol.encodeData('localabstract:/foo.sock').toString())
    );
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      return conn.socket.causeEnd();
    });
    return cmd.execute('localabstract:/foo.sock')
      .then(stream => done());
  });

  return it("should resolve with the stream", function(done) {
    const conn = new MockConnection;
    const cmd = new LocalCommand(conn);
    setImmediate(() => conn.socket.causeRead(Protocol.OKAY));
    return cmd.execute('/foo.sock')
      .then(function(stream) {
        stream.end();
        expect(stream).to.be.an.instanceof(Stream.Readable);
        return done();
    });
  });
});
