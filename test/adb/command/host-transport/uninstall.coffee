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
        Protocol.encodeData('shell:pm uninstall foo').toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Success\r\n'
      conn.socket.causeEnd()
    cmd.execute 'foo'
      .then ->
        done()

  it "should succeed even if command responds with 'Failure'", (done) ->
    conn = new MockConnection
    cmd = new UninstallCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('shell:pm uninstall foo').toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Failure\r\n'
      conn.socket.causeEnd()
    cmd.execute 'foo'
      .then ->
        done()

  it "should succeed even if command responds with 'Failure' w/ info", (done) ->
    conn = new MockConnection
    cmd = new UninstallCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('shell:pm uninstall foo').toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Failure [DELETE_FAILED_INTERNAL_ERROR]\r\n'
      conn.socket.causeEnd()
    cmd.execute 'foo'
      .then ->
        done()

  it "should ignore any other data", (done) ->
    conn = new MockConnection
    cmd = new UninstallCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('shell:pm uninstall foo').toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'open: Permission failed\r\n'
      conn.socket.causeRead 'Failure\r\n'
      conn.socket.causeEnd()
    cmd.execute 'foo'
      .then ->
        done()
