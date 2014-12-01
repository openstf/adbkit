Stream = require 'stream'
Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = Chai

MockConnection = require '../../../mock/connection'
Protocol = require '../../../../src/adb/protocol'
InstallCommand =
  require '../../../../src/adb/command/host-transport/install'

describe 'InstallCommand', ->

  it "should send 'pm install -d -r <apk>'", (done) ->
    conn = new MockConnection
    cmd = new InstallCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData("shell:pm install -r 'foo'").toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Success\r\n'
      conn.socket.causeEnd()
    cmd.execute 'foo'
      .then ->
        done()

  it "should succeed when command responds with 'Success'", (done) ->
    conn = new MockConnection
    cmd = new InstallCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Success\r\n'
      conn.socket.causeEnd()
    cmd.execute 'foo'
      .then ->
        done()

  it "should reject if command responds with 'Failure [REASON]'", (done) ->
    conn = new MockConnection
    cmd = new InstallCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Failure [BAR]\r\n'
      conn.socket.causeEnd()
    cmd.execute 'foo'
      .catch (err) ->
        done()

  it "should give detailed reason in rejection's code property", (done) ->
    conn = new MockConnection
    cmd = new InstallCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Failure [ALREADY_EXISTS]\r\n'
      conn.socket.causeEnd()
    cmd.execute 'foo'
      .catch (err) ->
        expect(err.code).to.equal 'ALREADY_EXISTS'
        done()

  it "should ignore any other data", (done) ->
    conn = new MockConnection
    cmd = new InstallCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'open: Permission failed\r\n'
      conn.socket.causeRead 'Success\r\n'
      conn.socket.causeEnd()
    cmd.execute 'foo'
      .then ->
        done()
