Stream = require 'stream'
Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = Chai

MockConnection = require '../../../mock/connection'
Protocol = require '../../../../src/adb/protocol'
LogCommand = require '../../../../src/adb/command/host-transport/log'

describe 'LogCommand', ->

  it "should send 'log:<log>'", (done) ->
    conn = new MockConnection
    cmd = new LogCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('log:main').toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeEnd()
    cmd.execute 'main'
      .then (stream) ->
        done()

  it "should resolve with the log stream", (done) ->
    conn = new MockConnection
    cmd = new LogCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
    cmd.execute 'main'
      .then (stream) ->
        stream.end()
        expect(stream).to.be.an.instanceof Stream.Readable
        done()
