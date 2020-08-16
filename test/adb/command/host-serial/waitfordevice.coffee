Stream = require 'stream'
Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = Chai

MockConnection = require '../../../mock/connection'
Protocol = require '../../../../src/adb/protocol'
WaitForDeviceCommand = \
  require '../../../../src/adb/command/host-serial/waitfordevice'

describe 'WaitForDeviceCommand', ->

  it "should send 'host-serial:<serial>:wait-for-any-device'", (done) ->
    conn = new MockConnection
    cmd = new WaitForDeviceCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('host-serial:abba:wait-for-any-device').toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeEnd()
    cmd.execute 'abba'
      .then ->
        done()

  it "should resolve with id when the device is connected", (done) ->
    conn = new MockConnection
    cmd = new WaitForDeviceCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeEnd()
    cmd.execute 'abba'
      .then (id) ->
        expect(id).to.equal 'abba'
        done()

  it "should reject with error if unable to connect", (done) ->
    conn = new MockConnection
    cmd = new WaitForDeviceCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead Protocol.FAIL
      conn.socket.causeRead \
        Protocol.encodeData('not sure how this might happen')
      conn.socket.causeEnd()
    cmd.execute 'abba'
      .catch (err) ->
        expect(err.message).to.contain 'not sure how this might happen'
        done()
