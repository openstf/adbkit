const Stream = require('stream');
const Sinon = require('sinon');
const Chai = require('chai');
Chai.use(require('sinon-chai'));
const {expect} = Chai;

const MockConnection = require('../../../mock/connection');
const Protocol = require('../../../../src/adb/protocol');
const LogCommand = require('../../../../src/adb/command/host-transport/log');

describe('LogCommand', function() {

  it("should send 'log:<log>'", function(done) {
    const conn = new MockConnection;
    const cmd = new LogCommand(conn);
    conn.socket.on('write', chunk =>
      expect(chunk.toString()).to.equal( 
        Protocol.encodeData('log:main').toString())
    );
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      return conn.socket.causeEnd();
    });
    return cmd.execute('main')
      .then(stream => done());
  });

  return it("should resolve with the log stream", function(done) {
    const conn = new MockConnection;
    const cmd = new LogCommand(conn);
    setImmediate(() => conn.socket.causeRead(Protocol.OKAY));
    return cmd.execute('main')
      .then(function(stream) {
        stream.end();
        expect(stream).to.be.an.instanceof(Stream.Readable);
        return done();
    });
  });
});
