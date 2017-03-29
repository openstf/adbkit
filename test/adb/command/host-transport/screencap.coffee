Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = Chai

MockConnection = require '../../../mock/connection'
Protocol = require '../../../../src/adb/protocol'
Parser = require '../../../../src/adb/parser'
ScreencapCommand =
  require '../../../../src/adb/command/host-transport/screencap'

describe 'ScreencapCommand', ->

  it "should send 'screencap -p'", (done) ->
    conn = new MockConnection
    cmd = new ScreencapCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('shell:echo && screencap -p 2>/dev/null').toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead '\r\nlegit image'
      conn.socket.causeEnd()
    cmd.execute()
      .then (stream) ->
        done()

  it "should resolve with the PNG stream", (done) ->
    conn = new MockConnection
    cmd = new ScreencapCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead '\r\nlegit image'
      conn.socket.causeEnd()
    cmd.execute()
      .then (stream) ->
        new Parser(stream).readAll()
      .then (out) ->
        expect(out.toString()).to.equal 'legit image'
        done()

  it "should reject if command not supported", (done) ->
    conn = new MockConnection
    cmd = new ScreencapCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeEnd()
    cmd.execute()
      .catch (err) ->
        done()

  it "should perform CRLF transformation by default", (done) ->
    conn = new MockConnection
    cmd = new ScreencapCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead '\r\nfoo\r\n'
      conn.socket.causeEnd()
    cmd.execute()
      .then (stream) ->
        new Parser(stream).readAll()
      .then (out) ->
        expect(out.toString()).to.equal 'foo\n'
        done()

  it "should not perform CRLF transformation if not needed", (done) ->
    conn = new MockConnection
    cmd = new ScreencapCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead '\nfoo\r\n'
      conn.socket.causeEnd()
    cmd.execute()
      .then (stream) ->
        new Parser(stream).readAll()
      .then (out) ->
        expect(out.toString()).to.equal 'foo\r\n'
        done()
