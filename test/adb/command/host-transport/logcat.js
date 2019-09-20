var Chai, LogcatCommand, MockConnection, Parser, Promise, Protocol, Sinon, Stream, expect;

Stream = require('stream');

Promise = require('bluebird');

Sinon = require('sinon');

Chai = require('chai');

Chai.use(require('sinon-chai'));

expect = Chai.expect;

MockConnection = require('../../../mock/connection');

Protocol = require('../../../../src/adb/protocol');

Parser = require('../../../../src/adb/parser');

LogcatCommand = require('../../../../src/adb/command/host-transport/logcat');

describe('LogcatCommand', function() {
  it("should send 'echo && logcat -B *:I'", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new LogcatCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData('shell:echo && logcat -B *:I 2>/dev/null').toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      return conn.socket.causeEnd();
    });
    return cmd.execute().then(function(stream) {
      return done();
    });
  });
  it("should send 'echo && logcat -c && logcat -B *:I' if options.clear is set", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new LogcatCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData('shell:echo && logcat -c 2>/dev/null && logcat -B *:I 2>/dev/null').toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      return conn.socket.causeEnd();
    });
    return cmd.execute({
      clear: true
    }).then(function(stream) {
      return done();
    });
  });
  it("should resolve with the logcat stream", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new LogcatCommand(conn);
    setImmediate(function() {
      return conn.socket.causeRead(Protocol.OKAY);
    });
    return cmd.execute().then(function(stream) {
      stream.end();
      expect(stream).to.be.an["instanceof"](Stream.Readable);
      return done();
    });
  });
  it("should perform CRLF transformation by default", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new LogcatCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('\r\nfoo\r\n');
      return conn.socket.causeEnd();
    });
    return cmd.execute().then(function(stream) {
      return new Parser(stream).readAll();
    }).then(function(out) {
      expect(out.toString()).to.equal('foo\n');
      return done();
    });
  });
  return it("should not perform CRLF transformation if not needed", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new LogcatCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('\nfoo\r\n');
      return conn.socket.causeEnd();
    });
    return cmd.execute().then(function(stream) {
      return new Parser(stream).readAll();
    }).then(function(out) {
      expect(out.toString()).to.equal('foo\r\n');
      return done();
    });
  });
});
