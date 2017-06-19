const Stream = require('stream');
const Promise = require('bluebird');
const Sinon = require('sinon');
const Chai = require('chai');
Chai.use(require('sinon-chai'));
const {expect} = Chai;

const MockConnection = require('../../../mock/connection');
const Protocol = require('../../../../src/adb/protocol');
const MonkeyCommand = require('../../../../src/adb/command/host-transport/monkey');

describe('MonkeyCommand', function() {

  it("should send 'monkey --port <port> -v'", function(done) {
    const conn = new MockConnection;
    const cmd = new MonkeyCommand(conn);
    conn.socket.on('write', chunk =>
      expect(chunk.toString()).to.equal( 
        Protocol.encodeData(`shell:EXTERNAL_STORAGE=/data/local/tmp monkey \
--port 1080 -v`).toString()
      )
    );
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      return conn.socket.causeRead(':Monkey: foo\n');
    });
    return cmd.execute(1080)
      .then(stream => done());
  });

  it("should resolve with the output stream", function(done) {
    const conn = new MockConnection;
    const cmd = new MonkeyCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      return conn.socket.causeRead(':Monkey: foo\n');
    });
    return cmd.execute(1080)
      .then(function(stream) {
        stream.end();
        expect(stream).to.be.an.instanceof(Stream.Readable);
        return done();
    });
  });

  return it(`should resolve after a timeout if result can't be judged from \
output`, function(done) {
    const conn = new MockConnection;
    const cmd = new MonkeyCommand(conn);
    setImmediate(() => conn.socket.causeRead(Protocol.OKAY));
    return cmd.execute(1080)
      .then(function(stream) {
        stream.end();
        expect(stream).to.be.an.instanceof(Stream.Readable);
        return done();
    });
  });
});
