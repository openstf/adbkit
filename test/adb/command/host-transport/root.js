/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const Stream = require('stream');
const Sinon = require('sinon');
const Chai = require('chai');
Chai.use(require('sinon-chai'));
const {expect} = Chai;

const MockConnection = require('../../../mock/connection');
const Protocol = require('../../../../src/adb/protocol');
const RootCommand = require('../../../../src/adb/command/host-transport/root');

describe('RootCommand', function() {

  it("should send 'root:'", function(done) {
    const conn = new MockConnection;
    const cmd = new RootCommand(conn);
    conn.socket.on('write', chunk => expect(chunk.toString()).to.equal( 
      Protocol.encodeData('root:').toString()));
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead("restarting adbd as root\n");
      return conn.socket.causeEnd();
    });
    return cmd.execute()
      .then(function(val) {
        expect(val).to.be.true;
        return done();
    });
  });

  return it("should reject on unexpected reply", function(done) {
    const conn = new MockConnection;
    const cmd = new RootCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead("adbd cannot run as root in production builds\n");
      return conn.socket.causeEnd();
    });
    return cmd.execute()
      .catch(function(err) {
        expect(err.message).to.eql( 
          'adbd cannot run as root in production builds');
        return done();
    });
  });
});
