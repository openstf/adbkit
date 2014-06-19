Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = Chai

MockConnection = require '../../../mock/connection'
Protocol = require '../../../../src/adb/protocol'
RebootCommand = require '../../../../src/adb/command/host-transport/reboot'

describe 'RebootCommand', ->

  it "should send 'reboot:'", (done) ->
    conn = new MockConnection
    cmd = new RebootCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('reboot:').toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeEnd()
    cmd.execute()
      .then ->
        done()

  it "should send wait for the connection to end", (done) ->
    conn = new MockConnection
    cmd = new RebootCommand conn
    ended = false
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('reboot:').toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
    setImmediate ->
      ended = true
      conn.socket.causeEnd()
    cmd.execute()
      .then ->
        expect(ended).to.be.true
        done()
