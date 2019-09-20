var Chai, LocalCommand, MockConnection, Protocol, Sinon, Stream, expect;

Stream = require('stream');

Sinon = require('sinon');

Chai = require('chai');

Chai.use(require('sinon-chai'));

expect = Chai.expect;

MockConnection = require('../../../mock/connection');

Protocol = require('../../../../src/adb/protocol');

LocalCommand = require('../../../../src/adb/command/host-transport/local');

describe('LocalCommand', function() {
  it("should send 'localfilesystem:<path>'", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new LocalCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData('localfilesystem:/foo.sock').toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      return conn.socket.causeEnd();
    });
    return cmd.execute('/foo.sock').then(function(stream) {
      return done();
    });
  });
  it("should send '<type>:<path>' if <path> prefixed with '<type>:'", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new LocalCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData('localabstract:/foo.sock').toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      return conn.socket.causeEnd();
    });
    return cmd.execute('localabstract:/foo.sock').then(function(stream) {
      return done();
    });
  });
  return it("should resolve with the stream", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new LocalCommand(conn);
    setImmediate(function() {
      return conn.socket.causeRead(Protocol.OKAY);
    });
    return cmd.execute('/foo.sock').then(function(stream) {
      stream.end();
      expect(stream).to.be.an["instanceof"](Stream.Readable);
      return done();
    });
  });
});
