var Chai, MockConnection, Parser, Protocol, Sinon, Stream, WaitBootCompleteCommand, expect;

Stream = require('stream');

Sinon = require('sinon');

Chai = require('chai');

Chai.use(require('sinon-chai'));

expect = Chai.expect;

MockConnection = require('../../../mock/connection');

Protocol = require('../../../../src/adb/protocol');

Parser = require('../../../../src/adb/parser');

WaitBootCompleteCommand = require('../../../../src/adb/command/host-transport/waitbootcomplete');

describe('WaitBootCompleteCommand', function() {
  it("should send a while loop with boot check", function(done) {
    var cmd, conn, want;
    conn = new MockConnection;
    cmd = new WaitBootCompleteCommand(conn);
    want = 'shell:while getprop sys.boot_completed 2>/dev/null; do sleep 1; done';
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData(want).toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('1\r\n');
      return conn.socket.causeEnd();
    });
    return cmd.execute().then(function() {
      return done();
    });
  });
  it("should reject with Parser.PrematureEOFError if connection cuts prematurely", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new WaitBootCompleteCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      return conn.socket.causeEnd();
    });
    return cmd.execute().then(function() {
      return done(new Error('Succeeded even though it should not'));
    })["catch"](Parser.PrematureEOFError, function(err) {
      return done();
    });
  });
  it("should not return until boot is complete", function(done) {
    var cmd, conn, sent;
    conn = new MockConnection;
    cmd = new WaitBootCompleteCommand(conn);
    sent = false;
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('\r\n');
      conn.socket.causeRead('\r\n');
      conn.socket.causeRead('\r\n');
      conn.socket.causeRead('\r\n');
      conn.socket.causeRead('\r\n');
      conn.socket.causeRead('\r\n');
      conn.socket.causeRead('\r\n');
      conn.socket.causeRead('\r\n');
      conn.socket.causeRead('\r\n');
      conn.socket.causeRead('\r\n');
      return setTimeout(function() {
        sent = true;
        return conn.socket.causeRead('1\r\n');
      }, 50);
    });
    return cmd.execute().then(function() {
      expect(sent).to.be["true"];
      return done();
    });
  });
  return it("should close connection when done", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new WaitBootCompleteCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      return conn.socket.causeRead('1\r\n');
    });
    conn.socket.on('end', function() {
      return done();
    });
    return cmd.execute();
  });
});
