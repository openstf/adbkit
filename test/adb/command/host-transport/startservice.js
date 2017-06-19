const Stream = require('stream');
const Sinon = require('sinon');
const Chai = require('chai');
Chai.use(require('sinon-chai'));
const {expect} = Chai;

const MockConnection = require('../../../mock/connection');
const Protocol = require('../../../../src/adb/protocol');
const StartServiceCommand = require( 
  '../../../../src/adb/command/host-transport/startservice');

describe('StartServiceCommand', function() {

  it("should succeed when 'Success' returned", function(done) {
    const conn = new MockConnection;
    const cmd = new StartServiceCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('Success');
      return conn.socket.causeEnd();
    });
    const options =
      {component: 'com.dummy.component/.Main'};
    return cmd.execute(options)
      .then(() => done());
  });

  it("should fail when 'Error' returned", function(done) {
    const conn = new MockConnection;
    const cmd = new StartServiceCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('Error: foo\n');
      return conn.socket.causeEnd();
    });
    const options =
      {component: 'com.dummy.component/.Main'};
    return cmd.execute(options)
      .catch(function(err) {
        expect(err).to.be.be.an.instanceOf(Error);
        return done();
    });
  });

  it("should send 'am startservice --user 0 -n <pkg>'", function(done) {
    const conn = new MockConnection;
    const cmd = new StartServiceCommand(conn);
    conn.socket.on('write', chunk =>
      expect(chunk.toString()).to.equal( 
        Protocol.encodeData(`shell:am startservice \
-n 'com.dummy.component/.Main' \
--user 0`).toString()
      )
    );
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('Success\n');
      return conn.socket.causeEnd();
    });
    const options = {
      component: 'com.dummy.component/.Main',
      user: 0
    };
    return cmd.execute(options)
      .then(() => done());
  });

  return it("should not send user option if not set'", function(done) {
    const conn = new MockConnection;
    const cmd = new StartServiceCommand(conn);
    conn.socket.on('write', chunk =>
      expect(chunk.toString()).to.equal( 
        Protocol.encodeData(`shell:am startservice \
-n 'com.dummy.component/.Main'`).toString()
      )
    );
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('Success\n');
      return conn.socket.causeEnd();
    });
    const options =
      {component: 'com.dummy.component/.Main'};
    return cmd.execute(options)
      .then(() => done());
  });
});
