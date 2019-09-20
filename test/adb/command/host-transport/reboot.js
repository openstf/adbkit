var Chai, MockConnection, Protocol, RebootCommand, Sinon, expect;

Sinon = require('sinon');

Chai = require('chai');

Chai.use(require('sinon-chai'));

expect = Chai.expect;

MockConnection = require('../../../mock/connection');

Protocol = require('../../../../src/adb/protocol');

RebootCommand = require('../../../../src/adb/command/host-transport/reboot');

describe('RebootCommand', function() {
  it("should send 'reboot:'", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new RebootCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData('reboot:').toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      return conn.socket.causeEnd();
    });
    return cmd.execute().then(function() {
      return done();
    });
  });
  return it("should send wait for the connection to end", function(done) {
    var cmd, conn, ended;
    conn = new MockConnection;
    cmd = new RebootCommand(conn);
    ended = false;
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData('reboot:').toString());
    });
    setImmediate(function() {
      return conn.socket.causeRead(Protocol.OKAY);
    });
    setImmediate(function() {
      ended = true;
      return conn.socket.causeEnd();
    });
    return cmd.execute().then(function() {
      expect(ended).to.be["true"];
      return done();
    });
  });
});
