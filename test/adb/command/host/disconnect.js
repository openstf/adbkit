Stream = require 'stream'
Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = Chai

MockConnection = require '../../../mock/connection'
Protocol = require '../../../../src/adb/protocol'
DisconnectCommand = require '../../../../src/adb/command/host/disconnect'

describe 'DisconnectCommand', ->

  it "should send 'host:disconnect:<host>:<port>'", (done) ->
    conn = new MockConnection
    cmd = new DisconnectCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('host:disconnect:192.168.2.2:5555').toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead Protocol.encodeData('')
      conn.socket.causeEnd()
    cmd.execute '192.168.2.2', 5555
      .then ->
        done()

  it "should resolve with the new device id if disconnected", (done) ->
    conn = new MockConnection
    cmd = new DisconnectCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead Protocol.encodeData('')
      conn.socket.causeEnd()
    cmd.execute '192.168.2.2', 5555
      .then (val) ->
        expect(val).to.be.equal '192.168.2.2:5555'
        done()

  it "should reject with error if unable to disconnect", (done) ->
    conn = new MockConnection
    cmd = new DisconnectCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead \
        Protocol.encodeData('No such device 192.168.2.2:5555')
      conn.socket.causeEnd()
    cmd.execute '192.168.2.2', 5555
      .catch (err) ->
        expect(err.message).to.eql 'No such device 192.168.2.2:5555'
        done()
