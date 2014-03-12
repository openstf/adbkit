Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = Chai

MockConnection = require '../../../mock/connection'
Protocol = require '../../../../src/adb/protocol'
RemountCommand = require '../../../../src/adb/command/host-transport/remount'

describe 'RemountCommand', ->

  it "should send 'remount:'", (done) ->
    conn = new MockConnection
    cmd = new RemountCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('remount:').toString()
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeEnd()
    cmd.execute()
      .then ->
        done()
