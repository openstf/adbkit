Stream = require 'stream'
Promise = require 'bluebird'
Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = Chai

MockConnection = require '../../../mock/connection'
Protocol = require '../../../../src/adb/protocol'
LogcatCommand = require '../../../../src/adb/command/host-transport/logcat'

describe 'LogcatCommand', ->

  it "should send 'logcat -B'", (done) ->
    conn = new MockConnection
    cmd = new LogcatCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('shell:logcat -B 2>/dev/null').toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeEnd()
    cmd.execute()
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

  it "should perform CRLF transformation", (done) ->
    conn = new MockConnection
    cmd = new LogcatCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'foo\r\n'
    cmd.execute()
      .then (stream) ->
        expect(stream).to.be.an.instanceof Stream.Readable

        resolver = Promise.defer()
        all = new Buffer 0

        stream.on 'readable', readableListner = ->
          while chunk = stream.read()
            all = Buffer.concat [all, chunk]
          if all.toString().indexOf('\n') isnt -1
            resolver.resolve all.toString()

        resolver.promise.finally ->
          stream.removeListener 'readable', readableListner
      .then (line) ->
        expect(line).to.equal 'foo\n'
        done()
