Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = Chai

MockConnection = require '../../../mock/connection'
Protocol = require '../../../../src/adb/protocol'
HostVersionCommand = require '../../../../src/adb/command/host/version'

describe 'HostVersionCommand', ->

  it "should send 'host:version'", (done) ->
    conn = new MockConnection
    cmd = new HostVersionCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('host:version').toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead Protocol.encodeData '0000'
      conn.socket.causeEnd()
    cmd.execute()
      .then (version) ->
        done()

  it "should resolve with version", (done) ->
    conn = new MockConnection
    cmd = new HostVersionCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead Protocol.encodeData (0x1234).toString 16
      conn.socket.causeEnd()
    cmd.execute()
      .then (version) ->
        expect(version).to.equal 0x1234
        done()

  it "should handle old-style version", (done) ->
    conn = new MockConnection
    cmd = new HostVersionCommand conn
    setImmediate ->
      conn.socket.causeRead (0x1234).toString 16
      conn.socket.causeEnd()
    cmd.execute()
      .then (version) ->
        expect(version).to.equal 0x1234
        done()
