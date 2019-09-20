var Chai, FrameBufferCommand, MockConnection, Protocol, Sinon, expect;

Sinon = require('sinon');

Chai = require('chai');

Chai.use(require('sinon-chai'));

expect = Chai.expect;

MockConnection = require('../../../mock/connection');

Protocol = require('../../../../src/adb/protocol');

FrameBufferCommand = require('../../../../src/adb/command/host-transport/framebuffer');

describe('FrameBufferCommand', function() {
  it("should send 'framebuffer:'", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new FrameBufferCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData('framebuffer:').toString());
    });
    setImmediate(function() {
      var meta;
      meta = new Buffer(52);
      meta.fill(0);
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead(meta);
      return conn.socket.causeEnd();
    });
    return cmd.execute('raw').then(function() {
      return done();
    });
  });
  return it("should parse meta header and return it as the 'meta' property of the stream", function(done) {
    var cmd, conn;
    conn = new MockConnection;
    cmd = new FrameBufferCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData('framebuffer:').toString());
    });
    setImmediate(function() {
      var meta, offset;
      meta = new Buffer(52);
      offset = 0;
      meta.writeUInt32LE(1, offset);
      meta.writeUInt32LE(32, offset += 4);
      meta.writeUInt32LE(819200, offset += 4);
      meta.writeUInt32LE(640, offset += 4);
      meta.writeUInt32LE(320, offset += 4);
      meta.writeUInt32LE(0, offset += 4);
      meta.writeUInt32LE(8, offset += 4);
      meta.writeUInt32LE(16, offset += 4);
      meta.writeUInt32LE(8, offset += 4);
      meta.writeUInt32LE(8, offset += 4);
      meta.writeUInt32LE(8, offset += 4);
      meta.writeUInt32LE(24, offset += 4);
      meta.writeUInt32LE(8, offset += 4);
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead(meta);
      return conn.socket.causeEnd();
    });
    return cmd.execute('raw').then(function(stream) {
      expect(stream).to.have.property('meta');
      expect(stream.meta).to.eql({
        version: 1,
        bpp: 32,
        size: 819200,
        width: 640,
        height: 320,
        red_offset: 0,
        red_length: 8,
        blue_offset: 16,
        blue_length: 8,
        green_offset: 8,
        green_length: 8,
        alpha_offset: 24,
        alpha_length: 8,
        format: 'rgba'
      });
      return done();
    });
  });
});
