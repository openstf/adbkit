/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const Sinon = require('sinon');
const Chai = require('chai');
Chai.use(require('sinon-chai'));
const {expect} = Chai;

const MockConnection = require('../../../mock/connection');
const Protocol = require('../../../../src/adb/protocol');
const HostVersionCommand = require('../../../../src/adb/command/host/version');

describe('HostVersionCommand', function() {

  it("should send 'host:version'", function(done) {
    const conn = new MockConnection;
    const cmd = new HostVersionCommand(conn);
    conn.socket.on('write', chunk => expect(chunk.toString()).to.equal( 
      Protocol.encodeData('host:version').toString()));
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead(Protocol.encodeData('0000'));
      return conn.socket.causeEnd();
    });
    return cmd.execute()
      .then(version => done());
  });

  it("should resolve with version", function(done) {
    const conn = new MockConnection;
    const cmd = new HostVersionCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead(Protocol.encodeData(((0x1234)).toString(16)));
      return conn.socket.causeEnd();
    });
    return cmd.execute()
      .then(function(version) {
        expect(version).to.equal(0x1234);
        return done();
    });
  });

  return it("should handle old-style version", function(done) {
    const conn = new MockConnection;
    const cmd = new HostVersionCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(((0x1234)).toString(16));
      return conn.socket.causeEnd();
    });
    return cmd.execute()
      .then(function(version) {
        expect(version).to.equal(0x1234);
        return done();
    });
  });
});
