var Chai, MockConnection, Protocol, RootCommand, Sinon, Stream, expect;

Stream = require('stream');

Sinon = require('sinon');

Chai = require('chai');

Chai.use(require('sinon-chai'));

expect = Chai.expect;

MockConnection = require('../../../mock/connection');

Protocol = require('../../../../src/adb/protocol');

RootCommand = require('../../../../src/adb/command/host-transport/root');

describe('RootCommand', function() {
  it("should send 'root:'", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new RootCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData('root:').toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead("restarting adbd as root\n");
      return conn.socket.causeEnd();
    });
    return cmd.execute().then(function(val) {
      expect(val).to.be["true"];
      return done();
    });
  });
  return it("should reject on unexpected reply", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new RootCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead("adbd cannot run as root in production builds\n");
      return conn.socket.causeEnd();
    });
    return cmd.execute()["catch"](function(err) {
      expect(err.message).to.eql('adbd cannot run as root in production builds');
      return done();
    });
  });
});
