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
const GetFeaturesCommand =
  require('../../../../src/adb/command/host-transport/getfeatures');

describe('GetFeaturesCommand', function() {

  it("should send 'pm list features'", function(done) {
    const conn = new MockConnection;
    const cmd = new GetFeaturesCommand(conn);
    conn.socket.on('write', chunk => expect(chunk.toString()).to.equal( 
      Protocol.encodeData('shell:pm list features 2>/dev/null').toString()));
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      return conn.socket.causeEnd();
    });
    return cmd.execute()
      .then(() => done());
  });

  it("should return an empty object for an empty feature list", function(done) {
    const conn = new MockConnection;
    const cmd = new GetFeaturesCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      return conn.socket.causeEnd();
    });
    return cmd.execute()
      .then(function(features) {
        expect(Object.keys(features)).to.be.empty;
        return done();
    });
  });

  return it("should return a map of features", function(done) {
    const conn = new MockConnection;
    const cmd = new GetFeaturesCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead(`\
feature:reqGlEsVersion=0x20000
feature:foo\r
feature:bar\
`
      );
      return conn.socket.causeEnd();
    });
    return cmd.execute()
      .then(function(features) {
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
