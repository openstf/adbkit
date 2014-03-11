Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = Chai

MockConnection = require '../../../mock/connection'
Protocol = require '../../../../src/adb/protocol'
FrameBufferCommand =
  require '../../../../src/adb/command/host-transport/framebuffer'

describe.only 'FrameBufferCommand', ->

  it "should send 'framebuffer:'", (done) ->
    conn = new MockConnection
    cmd = new FrameBufferCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('framebuffer:').toString()
    setImmediate ->
      meta = new Buffer 52
      meta.fill 0
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead meta
      conn.socket.causeEnd()
    cmd.execute 'raw'
      .then ->
        done()

  it "should parse meta header and return it as the 'meta'
      property of the stream", (done) ->
    conn = new MockConnection
    cmd = new FrameBufferCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('framebuffer:').toString()
    setImmediate ->
      meta = new Buffer 52
      offset = 0
      meta.writeUInt32LE 1, offset
      meta.writeUInt32LE 32, offset += 4
      meta.writeUInt32LE 819200, offset += 4
      meta.writeUInt32LE 640, offset += 4
      meta.writeUInt32LE 320, offset += 4
      meta.writeUInt32LE 0, offset += 4
      meta.writeUInt32LE 8, offset += 4
      meta.writeUInt32LE 16, offset += 4
      meta.writeUInt32LE 8, offset += 4
      meta.writeUInt32LE 8, offset += 4
      meta.writeUInt32LE 8, offset += 4
      meta.writeUInt32LE 24, offset += 4
      meta.writeUInt32LE 8, offset += 4
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead meta
      conn.socket.causeEnd()
    cmd.execute 'raw'
      .then (stream) ->
        expect(stream).to.have.property 'meta'
        expect(stream.meta).to.eql
          version: 1
          bpp: 32
          size: 819200
          width: 640
          height: 320
          red_offset: 0
          red_length: 8
          blue_offset: 16
          blue_length: 8
          green_offset: 8
          green_length: 8
          alpha_offset: 24
          alpha_length: 8
          format: 'rgba'
        done()
