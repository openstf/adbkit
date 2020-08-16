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
const ClearCommand = require('../../../../src/adb/command/host-transport/clear');

describe('ClearCommand', function() {

  it("should send 'pm clear <pkg>'", function(done) {
    const conn = new MockConnection;
    const cmd = new ClearCommand(conn);
    conn.socket.on('write', function(chunk) {
      expect(chunk.toString()).to.equal( 
        Protocol.encodeData('shell:pm clear foo.bar.c').toString());
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('Success\r\n');
      return conn.socket.causeEnd();
    });
    return cmd.execute('foo.bar.c')
      .then(() => done());
  });

  it("should succeed on 'Success'", function(done) {
    const conn = new MockConnection;
    const cmd = new ClearCommand(conn);
    conn.socket.on('write', function(chunk) {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('Success\r\n');
      return conn.socket.causeEnd();
    });
    return cmd.execute('foo.bar.c')
      .then(() => done());
  });

  it("should error on 'Failed'", function(done) {
    const conn = new MockConnection;
    const cmd = new ClearCommand(conn);
    conn.socket.on('write', function(chunk) {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('Failed\r\n');
      return conn.socket.causeEnd();
    });
    return cmd.execute('foo.bar.c')
      .catch(function(err) {
        expect(err).to.be.an.instanceof(Error);
        return done();
    });
  });

  it(`should error on 'Failed' even if connection not closed by \
device`, function(done) {
    const conn = new MockConnection;
    const cmd = new ClearCommand(conn);
    conn.socket.on('write', function(chunk) {
      conn.socket.causeRead(Protocol.OKAY);
      return conn.socket.causeRead('Failed\r\n');
    });
    return cmd.execute('foo.bar.c')
      .catch(function(err) {
        expect(err).to.be.an.instanceof(Error);
        return done();
    });
  });

  return it("should ignore irrelevant lines", function(done) {
    const conn = new MockConnection;
    const cmd = new ClearCommand(conn);
    conn.socket.on('write', function(chunk) {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('Open: foo error\n\n');
      conn.socket.causeRead('Success\r\n');
      return conn.socket.causeEnd();
    });
    return cmd.execute('foo.bar.c')
      .then(() => done());
  });
});
