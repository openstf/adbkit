Stream = require 'stream'
Promise = require 'bluebird'
Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = Chai

MockConnection = require '../../../mock/connection'
Protocol = require '../../../../src/adb/protocol'
MonkeyCommand = require '../../../../src/adb/command/host-transport/monkey'

describe 'MonkeyCommand', ->

  it "should send 'monkey --port <port> -v'", (done) ->
    conn = new MockConnection
    cmd = new MonkeyCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('shell:EXTERNAL_STORAGE=/data/local/tmp monkey
          --port 1080 -v').toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead ':Monkey: foo\n'
    cmd.execute 1080
      .then (stream) ->
        done()

  it "should resolve with the output stream", (done) ->
    conn = new MockConnection
    cmd = new MonkeyCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead ':Monkey: foo\n'
    cmd.execute 1080
      .then (stream) ->
        stream.end()
        expect(stream).to.be.an.instanceof Stream.Readable
        done()

  it "should resolve after a timeout if result can't be judged from
      output", (done) ->
    conn = new MockConnection
    cmd = new MonkeyCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
    cmd.execute 1080
      .then (stream) ->
        stream.end()
        expect(stream).to.be.an.instanceof Stream.Readable
        done()
