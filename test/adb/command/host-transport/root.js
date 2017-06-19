Stream = require 'stream'
Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = Chai

MockConnection = require '../../../mock/connection'
Protocol = require '../../../../src/adb/protocol'
RootCommand = require '../../../../src/adb/command/host-transport/root'

describe 'RootCommand', ->

  it "should send 'root:'", (done) ->
    conn = new MockConnection
    cmd = new RootCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('root:').toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead "restarting adbd as root\n"
      conn.socket.causeEnd()
    cmd.execute()
      .then (val) ->
        expect(val).to.be.true
        done()

  it "should reject on unexpected reply", (done) ->
    conn = new MockConnection
    cmd = new RootCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead "adbd cannot run as root in production builds\n"
      conn.socket.causeEnd()
    cmd.execute()
      .catch (err) ->
        expect(err.message).to.eql \
          'adbd cannot run as root in production builds'
        done()
