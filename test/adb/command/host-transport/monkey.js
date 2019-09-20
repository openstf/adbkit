var Chai, MockConnection, MonkeyCommand, Promise, Protocol, Sinon, Stream, expect;

Stream = require('stream');

Promise = require('bluebird');

Sinon = require('sinon');

Chai = require('chai');

Chai.use(require('sinon-chai'));

expect = Chai.expect;

MockConnection = require('../../../mock/connection');

Protocol = require('../../../../src/adb/protocol');

MonkeyCommand = require('../../../../src/adb/command/host-transport/monkey');

describe('MonkeyCommand', function() {
  it("should send 'monkey --port <port> -v'", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new MonkeyCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData('shell:EXTERNAL_STORAGE=/data/local/tmp monkey --port 1080 -v').toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      return conn.socket.causeRead(':Monkey: foo\n');
    });
    return cmd.execute(1080).then(function(stream) {
      return done();
    });
  });
  it("should resolve with the output stream", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new MonkeyCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      return conn.socket.causeRead(':Monkey: foo\n');
    });
    return cmd.execute(1080).then(function(stream) {
      stream.end();
      expect(stream).to.be.an["instanceof"](Stream.Readable);
      return done();
    });
  });
  return it("should resolve after a timeout if result can't be judged from output", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new MonkeyCommand(conn);
    setImmediate(function() {
      return conn.socket.causeRead(Protocol.OKAY);
    });
    return cmd.execute(1080).then(function(stream) {
      stream.end();
      expect(stream).to.be.an["instanceof"](Stream.Readable);
      return done();
    });
  });
});
