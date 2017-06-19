const Stream = require('stream');
const Sinon = require('sinon');
const Chai = require('chai');
Chai.use(require('sinon-chai'));
const {expect} = Chai;

const MockConnection = require('../../../mock/connection');
const Protocol = require('../../../../src/adb/protocol');
const GetPropertiesCommand =
  require('../../../../src/adb/command/host-transport/getproperties');

describe('GetPropertiesCommand', function() {

  it("should send 'getprop'", function(done) {
    const conn = new MockConnection;
    const cmd = new GetPropertiesCommand(conn);
    conn.socket.on('write', chunk =>
      expect(chunk.toString()).to.equal( 
        Protocol.encodeData('shell:getprop').toString())
    );
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      return conn.socket.causeEnd();
    });
    return cmd.execute()
      .then(() => done());
  });

  it("should return an empty object for an empty property list", function(done) {
    const conn = new MockConnection;
    const cmd = new GetPropertiesCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      return conn.socket.causeEnd();
    });
    return cmd.execute()
      .then(function(properties) {
        expect(Object.keys(properties)).to.be.empty;
        return done();
    });
  });

  return it("should return a map of properties", function(done) {
    const conn = new MockConnection;
    const cmd = new GetPropertiesCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead(`\
[ro.product.locale.region]: [US]
[ro.product.manufacturer]: [samsung]\r
[ro.product.model]: [SC-04E]
[ro.product.name]: [SC-04E]\
`
      );
      return conn.socket.causeEnd();
    });
    return cmd.execute()
      .then(function(properties) {
        expect(Object.keys(properties)).to.have.length(4);
        expect(properties).to.eql({
          'ro.product.locale.region': 'US',
          'ro.product.manufacturer': 'samsung',
          'ro.product.model': 'SC-04E',
          'ro.product.name': 'SC-04E'
        });
        return done();
    });
  });
});
