Stream = require 'stream'
Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = Chai

MockConnection = require '../../../mock/connection'
Protocol = require '../../../../src/adb/protocol'
ConnectCommand = require '../../../../src/adb/command/host/connect'

describe 'ConnectCommand', ->

  it "should send 'host:connect:<host>:<port>'", (done) ->
    conn = new MockConnection
    cmd = new ConnectCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('host:connect:192.168.2.2:5555').toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead Protocol.encodeData('connected to 192.168.2.2:5555')
      conn.socket.causeEnd()
    cmd.execute '192.168.2.2', 5555
      .then ->
        done()

  it "should resolve with the new device id if connected", (done) ->
    conn = new MockConnection
    cmd = new ConnectCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead Protocol.encodeData('connected to 192.168.2.2:5555')
      conn.socket.causeEnd()
    cmd.execute '192.168.2.2', 5555
      .then (val) ->
        expect(val).to.be.equal '192.168.2.2:5555'
        done()

  it "should resolve with the new device id if already connected", (done) ->
    conn = new MockConnection
    cmd = new ConnectCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead \
        Protocol.encodeData('already connected to 192.168.2.2:5555')
      conn.socket.causeEnd()
    cmd.execute '192.168.2.2', 5555
      .then (val) ->
        expect(val).to.be.equal '192.168.2.2:5555'
        done()

  it "should reject with error if unable to connect", (done) ->
    conn = new MockConnection
    cmd = new ConnectCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead \
        Protocol.encodeData('unable to connect to 192.168.2.2:5555')
      conn.socket.causeEnd()
    cmd.execute '192.168.2.2', 5555
      .catch (err) ->
        expect(err.message).to.eql 'unable to connect to 192.168.2.2:5555'
        done()
