Stream = require 'stream'
Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = Chai

MockConnection = require '../../../mock/connection'
Protocol = require '../../../../src/adb/protocol'
LocalCommand = require '../../../../src/adb/command/host-transport/local'

describe 'LocalCommand', ->

  it "should send 'localfilesystem:<path>'", (done) ->
    conn = new MockConnection
    cmd = new LocalCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('localfilesystem:/foo.sock').toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeEnd()
    cmd.execute '/foo.sock'
      .then (stream) ->
        done()

  it "should send '<type>:<path>' if <path> prefixed with '<type>:'", (done) ->
    conn = new MockConnection
    cmd = new LocalCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('localabstract:/foo.sock').toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeEnd()
    cmd.execute 'localabstract:/foo.sock'
      .then (stream) ->
        done()

  it "should resolve with the stream", (done) ->
    conn = new MockConnection
    cmd = new LocalCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
    cmd.execute '/foo.sock'
      .then (stream) ->
        stream.end()
        expect(stream).to.be.an.instanceof Stream.Readable
        done()
