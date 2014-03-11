Stream = require 'stream'
Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = Chai

MockConnection = require '../../../mock/connection'
Protocol = require '../../../../src/adb/protocol'
TcpCommand = require '../../../../src/adb/command/host-transport/tcp'

describe 'TcpCommand', ->

  it "should send 'tcp:<port>' when no host given", (done) ->
    conn = new MockConnection
    cmd = new TcpCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('tcp:8080').toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeEnd()
    cmd.execute 8080
      .then (stream) ->
        done()

  it "should send 'tcp:<port>:<host>' when host given", (done) ->
    conn = new MockConnection
    cmd = new TcpCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('tcp:8080:127.0.0.1').toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeEnd()
    cmd.execute 8080, '127.0.0.1'
      .then (stream) ->
        done()

  it "should resolve with the tcp stream", (done) ->
    conn = new MockConnection
    cmd = new TcpCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
    cmd.execute 8080
      .then (stream) ->
        stream.end()
        expect(stream).to.be.an.instanceof Stream.Readable
        done()
