var Chai, GetPackagesCommand, MockConnection, Protocol, Sinon, Stream, expect;

Stream = require('stream');

Sinon = require('sinon');

Chai = require('chai');

Chai.use(require('sinon-chai'));

expect = Chai.expect;

MockConnection = require('../../../mock/connection');

Protocol = require('../../../../src/adb/protocol');

GetPackagesCommand = require('../../../../src/adb/command/host-transport/getpackages');

describe('GetPackagesCommand', function() {
  it("should send 'pm list packages'", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new GetPackagesCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData('shell:pm list packages 2>/dev/null').toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      return conn.socket.causeEnd();
    });
    return cmd.execute().then(function() {
      return done();
    });
  });
  it("should return an empty array for an empty package list", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new GetPackagesCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      return conn.socket.causeEnd();
    });
    return cmd.execute().then(function(packages) {
      expect(packages).to.be.empty;
      return done();
    });
  });
  return it("should return an array of packages", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new GetPackagesCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead("package:com.google.android.gm\npackage:com.google.android.inputmethod.japanese\npackage:com.google.android.tag\r\npackage:com.google.android.GoogleCamera\npackage:com.google.android.youtube\npackage:com.google.android.apps.magazines\npackage:com.google.earth");
      return conn.socket.causeEnd();
    });
    return cmd.execute().then(function(packages) {
      expect(packages).to.have.length(7);
      expect(packages).to.eql(['com.google.android.gm', 'com.google.android.inputmethod.japanese', 'com.google.android.tag', 'com.google.android.GoogleCamera', 'com.google.android.youtube', 'com.google.android.apps.magazines', 'com.google.earth']);
      return done();
    });
  });
});
