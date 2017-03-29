Stream = require 'stream'
Promise = require 'bluebird'
Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = Chai

MockConnection = require '../../../mock/connection'
Protocol = require '../../../../src/adb/protocol'
Parser = require '../../../../src/adb/parser'
LogcatCommand = require '../../../../src/adb/command/host-transport/logcat'

describe 'LogcatCommand', ->

  it "should send 'echo && logcat -B *:I'", (done) ->
    conn = new MockConnection
    cmd = new LogcatCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('shell:echo &&
          logcat -B *:I 2>/dev/null').toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeEnd()
    cmd.execute()
      .then (stream) ->
        done()

  it "should send 'echo && logcat -c && logcat -B *:I' if options.clear
      is set", (done) ->
    conn = new MockConnection
    cmd = new LogcatCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('shell:echo && logcat -c 2>/dev/null &&
          logcat -B *:I 2>/dev/null').toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeEnd()
    cmd.execute clear: true
      .then (stream) ->
        done()

  it "should resolve with the logcat stream", (done) ->
    conn = new MockConnection
    cmd = new LogcatCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
    cmd.execute()
      .then (stream) ->
        stream.end()
        expect(stream).to.be.an.instanceof Stream.Readable
        done()

  it "should perform CRLF transformation by default", (done) ->
    conn = new MockConnection
    cmd = new LogcatCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'foo\r\n'
      conn.socket.causeEnd()
    cmd.execute()
      .then (stream) ->
        new Parser(stream).readAll()
      .then (out) ->
        expect(out.toString()).to.equal 'foo\n'
        done()

  it "should not perform CRLF transformation if not needed", (done) ->
    conn = new MockConnection
    cmd = new LogcatCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead '\nfoo\r\n'
      conn.socket.causeEnd()
    cmd.execute()
      .then (stream) ->
        new Parser(stream).readAll()
      .then (out) ->
        expect(out.toString()).to.equal '\nfoo\r\n'
        done()
