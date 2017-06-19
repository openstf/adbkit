const Sinon = require('sinon');
const Chai = require('chai');
Chai.use(require('sinon-chai'));
const {expect} = Chai;

const MockConnection = require('../../../mock/connection');
const Protocol = require('../../../../src/adb/protocol');
const Parser = require('../../../../src/adb/parser');
const ScreencapCommand =
  require('../../../../src/adb/command/host-transport/screencap');

describe('ScreencapCommand', function() {

  it("should send 'screencap -p'", function(done) {
    const conn = new MockConnection;
    const cmd = new ScreencapCommand(conn);
    conn.socket.on('write', chunk =>
      expect(chunk.toString()).to.equal( 
        Protocol.encodeData('shell:echo && screencap -p 2>/dev/null').toString())
    );
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('\r\nlegit image');
      return conn.socket.causeEnd();
    });
    return cmd.execute()
      .then(stream => done());
  });

  it("should resolve with the PNG stream", function(done) {
    const conn = new MockConnection;
    const cmd = new ScreencapCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('\r\nlegit image');
      return conn.socket.causeEnd();
    });
    return cmd.execute()
      .then(stream => new Parser(stream).readAll()).then(function(out) {
        expect(out.toString()).to.equal('legit image');
        return done();
    });
  });

  it("should reject if command not supported", function(done) {
    const conn = new MockConnection;
    const cmd = new ScreencapCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      return conn.socket.causeEnd();
    });
    return cmd.execute()
      .catch(err => done());
  });

  it("should perform CRLF transformation by default", function(done) {
    const conn = new MockConnection;
    const cmd = new ScreencapCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('\r\nfoo\r\n');
      return conn.socket.causeEnd();
    });
    return cmd.execute()
      .then(stream => new Parser(stream).readAll()).then(function(out) {
        expect(out.toString()).to.equal('foo\n');
        return done();
    });
  });

  return it("should not perform CRLF transformation if not needed", function(done) {
    const conn = new MockConnection;
    const cmd = new ScreencapCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('\nfoo\r\n');
      return conn.socket.causeEnd();
    });
    return cmd.execute()
      .then(stream => new Parser(stream).readAll()).then(function(out) {
        expect(out.toString()).to.equal('foo\r\n');
        return done();
    });
  });
});
