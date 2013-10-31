Stream = require 'stream'
Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = Chai

MockConnection = require '../../../mock/connection'
Protocol = require '../../../../src/adb/protocol'
UninstallCommand =
  require '../../../../src/adb/command/host-transport/uninstall'

describe 'UninstallCommand', ->

  it "should succeed when command responds with 'Success'", (done) ->
    conn = new MockConnection
    cmd = new UninstallCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('shell:pm uninstall foo 2>/dev/null').toString()
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Success\r\n'
      conn.socket.causeEnd()
    cmd.execute 'foo', (err) ->
      expect(err).to.be.null
      done()

  it "should succeed even if command responds with 'Failure'", (done) ->
    conn = new MockConnection
    cmd = new UninstallCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('shell:pm uninstall foo 2>/dev/null').toString()
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Failure\r\n'
      conn.socket.causeEnd()
    cmd.execute 'foo', (err) ->
      expect(err).to.be.null
      done()

  it "should fail if any other data is received", (done) ->
    conn = new MockConnection
    cmd = new UninstallCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('shell:pm uninstall foo 2>/dev/null').toString()
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'open: Permission failed\r\n'
      conn.socket.causeRead 'Failure\r\n'
      conn.socket.causeEnd()
    cmd.execute 'foo', (err) ->
      expect(err).to.be.an.instanceof Error
      done()
