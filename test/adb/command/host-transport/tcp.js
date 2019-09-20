var Chai, MockConnection, Protocol, Sinon, Stream, TcpCommand, expect;

Stream = require('stream');

Sinon = require('sinon');

Chai = require('chai');

Chai.use(require('sinon-chai'));

expect = Chai.expect;

MockConnection = require('../../../mock/connection');

Protocol = require('../../../../src/adb/protocol');

TcpCommand = require('../../../../src/adb/command/host-transport/tcp');

describe('TcpCommand', function() {
  it("should send 'tcp:<port>' when no host given", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new TcpCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData('tcp:8080').toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      return conn.socket.causeEnd();
    });
    return cmd.execute(8080).then(function(stream) {
      return done();
    });
  });
  it("should send 'tcp:<port>:<host>' when host given", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new TcpCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData('tcp:8080:127.0.0.1').toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      return conn.socket.causeEnd();
    });
    return cmd.execute(8080, '127.0.0.1').then(function(stream) {
      return done();
    });
  });
  return it("should resolve with the tcp stream", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new TcpCommand(conn);
    setImmediate(function() {
      return conn.socket.causeRead(Protocol.OKAY);
    });
    return cmd.execute(8080).then(function(stream) {
      stream.end();
      expect(stream).to.be.an["instanceof"](Stream.Readable);
      return done();
    });
  });
});
