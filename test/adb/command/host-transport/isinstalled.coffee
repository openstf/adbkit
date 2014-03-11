Stream = require 'stream'
Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = Chai

MockConnection = require '../../../mock/connection'
Protocol = require '../../../../src/adb/protocol'
IsInstalledCommand =
  require '../../../../src/adb/command/host-transport/isinstalled'

describe 'IsInstalledCommand', ->

  it "should send 'pm path <pkg>'", (done) ->
    conn = new MockConnection
    cmd = new IsInstalledCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData("shell:pm path foo 2>/dev/null").toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'package:foo\r\n'
      conn.socket.causeEnd()
    cmd.execute 'foo'
      .then ->
        done()

  it "should resolve with true if package returned by command", (done) ->
    conn = new MockConnection
    cmd = new IsInstalledCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'package:bar\r\n'
      conn.socket.causeEnd()
    cmd.execute 'foo'
      .then (found) ->
        expect(found).to.be.true
        done()

  it "should resolve with false if no package returned", (done) ->
    conn = new MockConnection
    cmd = new IsInstalledCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeEnd()
    cmd.execute 'foo'
      .then (found) ->
        expect(found).to.be.false
        done()

  it "should fail if any other data is received", (done) ->
    conn = new MockConnection
    cmd = new IsInstalledCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'open: Permission failed\r\n'
      conn.socket.causeEnd()
    cmd.execute 'foo'
      .catch (err) ->
        expect(err).to.be.an.instanceof Error
        done()
