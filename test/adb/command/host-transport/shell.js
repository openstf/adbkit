var Chai, MockConnection, Parser, Protocol, ShellCommand, Sinon, Stream, expect;

Stream = require('stream');

Sinon = require('sinon');

Chai = require('chai');

Chai.use(require('sinon-chai'));

expect = Chai.expect;

MockConnection = require('../../../mock/connection');

Protocol = require('../../../../src/adb/protocol');

Parser = require('../../../../src/adb/parser');

ShellCommand = require('../../../../src/adb/command/host-transport/shell');

describe('ShellCommand', function() {
  it("should pass String commands as-is", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new ShellCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData('shell:foo \'bar').toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      return conn.socket.causeEnd();
    });
    return cmd.execute('foo \'bar').then(function(out) {
      return done();
    });
  });
  it("should escape Array commands", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new ShellCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData("shell:'foo' ''\"'\"'bar'\"'\"'' '\"'").toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      return conn.socket.causeEnd();
    });
    return cmd.execute(['foo', '\'bar\'', '"']).then(function(out) {
      return done();
    });
  });
  it("should not escape numbers in arguments", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new ShellCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData("shell:'foo' 67").toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      return conn.socket.causeEnd();
    });
    return cmd.execute(['foo', 67]).then(function(out) {
      return done();
    });
  });
  return it("should reject with FailError on ADB failure (not command failure)", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new ShellCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData("shell:'foo'").toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.FAIL);
      conn.socket.causeRead(Protocol.encodeData('mystery'));
      return conn.socket.causeEnd();
    });
    return cmd.execute(['foo'])["catch"](Parser.FailError, function(err) {
      return done();
    });
  });
});
