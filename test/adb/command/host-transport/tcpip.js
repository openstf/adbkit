Stream = require 'stream'
Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = Chai

MockConnection = require '../../../mock/connection'
Protocol = require '../../../../src/adb/protocol'
TcpIpCommand = require '../../../../src/adb/command/host-transport/tcpip'

describe 'TcpIpCommand', ->

  it "should send 'tcp:<port>'", (done) ->
    conn = new MockConnection
    cmd = new TcpIpCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('tcpip:5555').toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead "restarting in TCP mode port: 5555\n"
      conn.socket.causeEnd()
    cmd.execute 5555
      .then ->
        done()

  it "should resolve with the port", (done) ->
    conn = new MockConnection
    cmd = new TcpIpCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead "restarting in TCP mode port: 5555\n"
      conn.socket.causeEnd()
    cmd.execute 5555
      .then (port) ->
        expect(port).to.equal 5555
        done()

  it "should reject on unexpected reply", (done) ->
    conn = new MockConnection
    cmd = new TcpIpCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead "not sure what this could be\n"
      conn.socket.causeEnd()
    cmd.execute 5555
      .catch (err) ->
        expect(err.message).to.eql 'not sure what this could be'
        done()
