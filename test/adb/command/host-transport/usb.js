Stream = require 'stream'
Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = Chai

MockConnection = require '../../../mock/connection'
Protocol = require '../../../../src/adb/protocol'
UsbCommand = require '../../../../src/adb/command/host-transport/usb'

describe 'UsbCommand', ->

  it "should send 'usb:'", (done) ->
    conn = new MockConnection
    cmd = new UsbCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('usb:').toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead "restarting in USB mode\n"
      conn.socket.causeEnd()
    cmd.execute()
      .then (val) ->
        expect(val).to.be.true
        done()

  it "should reject on unexpected reply", (done) ->
    conn = new MockConnection
    cmd = new UsbCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead "invalid port\n"
      conn.socket.causeEnd()
    cmd.execute()
      .catch (err) ->
        expect(err.message).to.eql 'invalid port'
        done()
