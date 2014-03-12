Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = Chai

MockConnection = require '../../../mock/connection'
Protocol = require '../../../../src/adb/protocol'
SyncCommand = require '../../../../src/adb/command/host-transport/sync'

describe 'SyncCommand', ->

  it "should send 'sync:'", (done) ->
    conn = new MockConnection
    cmd = new SyncCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('sync:').toString()
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeEnd()
    cmd.execute()
      .then ->
        done()
