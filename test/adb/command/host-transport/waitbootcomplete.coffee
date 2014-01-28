Stream = require 'stream'
Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = Chai

MockConnection = require '../../../mock/connection'
Protocol = require '../../../../src/adb/protocol'
WaitBootCompleteCommand =
  require '../../../../src/adb/command/host-transport/waitbootcomplete'

describe 'WaitBootCompleteCommand', ->

  it "should send a while loop with boot check", (done) ->
    conn = new MockConnection
    cmd = new WaitBootCompleteCommand conn
    want =
      'shell:while getprop sys.boot_completed 2>/dev/null; do sleep 1; done'
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData(want).toString()
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeEnd()
      done()
    cmd.execute (err) ->

  it "should error if connection cuts prematurely", (done) ->
    conn = new MockConnection
    cmd = new WaitBootCompleteCommand conn
    conn.socket.on 'write', (chunk) ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeEnd()
    cmd.execute (err) ->
      expect(err).to.be.an.instanceOf Error
      done()

  it "should not return until boot is complete", (done) ->
    conn = new MockConnection
    cmd = new WaitBootCompleteCommand conn
    allow = false
    conn.socket.on 'write', (chunk) ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead '\r\n'
      conn.socket.causeRead '\r\n'
      conn.socket.causeRead '\r\n'
      conn.socket.causeRead '\r\n'
      conn.socket.causeRead '\r\n'
      conn.socket.causeRead '\r\n'
      conn.socket.causeRead '\r\n'
      conn.socket.causeRead '\r\n'
      conn.socket.causeRead '\r\n'
      conn.socket.causeRead '\r\n'
      setTimeout ->
        allow = true
        conn.socket.causeRead '1\r\n'
      , 50
    cmd.execute (err) ->
      expect(err).to.be.null
      expect(allow).to.be.true
      done()

  it "should close connection when done", (done) ->
    conn = new MockConnection
    cmd = new WaitBootCompleteCommand conn
    conn.socket.on 'write', (chunk) ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead '1\r\n'
    conn.socket.on 'end', ->
      done()
    cmd.execute (err) ->
      expect(err).to.be.null
