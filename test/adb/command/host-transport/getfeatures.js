var Chai, GetFeaturesCommand, MockConnection, Protocol, Sinon, Stream, expect;

Stream = require('stream');

Sinon = require('sinon');

Chai = require('chai');

Chai.use(require('sinon-chai'));

expect = Chai.expect;

MockConnection = require('../../../mock/connection');

Protocol = require('../../../../src/adb/protocol');

GetFeaturesCommand = require('../../../../src/adb/command/host-transport/getfeatures');

describe('GetFeaturesCommand', function() {
  it("should send 'pm list features'", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new GetFeaturesCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData('shell:pm list features 2>/dev/null').toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      return conn.socket.causeEnd();
    });
    return cmd.execute().then(function() {
      return done();
    });
  });
  it("should return an empty object for an empty feature list", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new GetFeaturesCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      return conn.socket.causeEnd();
    });
    return cmd.execute().then(function(features) {
      expect(Object.keys(features)).to.be.empty;
      return done();
    });
  });
  return it("should return a map of features", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new GetFeaturesCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead("feature:reqGlEsVersion=0x20000\nfeature:foo\r\nfeature:bar");
      return conn.socket.causeEnd();
    });
    return cmd.execute().then(function(features) {
      expect(Object.keys(features)).to.have.length(3);
      expect(features).to.eql({
        reqGlEsVersion: '0x20000',
        foo: true,
        bar: true
      });
      return done();
    });
  });
});
