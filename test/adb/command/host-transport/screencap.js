var Chai, MockConnection, Parser, Protocol, ScreencapCommand, Sinon, expect;

Sinon = require('sinon');

Chai = require('chai');

Chai.use(require('sinon-chai'));

expect = Chai.expect;

MockConnection = require('../../../mock/connection');

Protocol = require('../../../../src/adb/protocol');

Parser = require('../../../../src/adb/parser');

ScreencapCommand = require('../../../../src/adb/command/host-transport/screencap');

describe('ScreencapCommand', function() {
  it("should send 'screencap -p'", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new ScreencapCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData('shell:echo && screencap -p 2>/dev/null').toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('\r\nlegit image');
      return conn.socket.causeEnd();
    });
    return cmd.execute().then(function(stream) {
      return done();
    });
  });
  it("should resolve with the PNG stream", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new ScreencapCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('\r\nlegit image');
      return conn.socket.causeEnd();
    });
    return cmd.execute().then(function(stream) {
      return new Parser(stream).readAll();
    }).then(function(out) {
      expect(out.toString()).to.equal('legit image');
      return done();
    });
  });
  it("should reject if command not supported", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new ScreencapCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      return conn.socket.causeEnd();
    });
    return cmd.execute()["catch"](function(err) {
      return done();
    });
  });
  it("should perform CRLF transformation by default", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new ScreencapCommand(conn);
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
    cmd = new ScreencapCommand(conn);
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
