Stream = require 'stream'
Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = Chai

MockConnection = require '../../../mock/connection'
Protocol = require '../../../../src/adb/protocol'
StartServiceCommand = require \
  '../../../../src/adb/command/host-transport/startservice'

describe 'StartServiceCommand', ->

  it "should succeed when 'Success' returned", (done) ->
    conn = new MockConnection
    cmd = new StartServiceCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Success'
      conn.socket.causeEnd()
    options =
      component: 'com.dummy.component/.Main'
    cmd.execute options
      .then ->
        done()

  it "should fail when 'Error' returned", (done) ->
    conn = new MockConnection
    cmd = new StartServiceCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Error: foo\n'
      conn.socket.causeEnd()
    options =
      component: 'com.dummy.component/.Main'
    cmd.execute options
      .catch (err) ->
        expect(err).to.be.be.an.instanceOf Error
        done()

  it "should send 'am startservice --user 0 -n <pkg>'", (done) ->
    conn = new MockConnection
    cmd = new StartServiceCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData("shell:am startservice
          -n 'com.dummy.component/.Main'
          --user 0").toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Success\n'
      conn.socket.causeEnd()
    options =
      component: 'com.dummy.component/.Main'
      user: 0
    cmd.execute options
      .then ->
        done()

  it "should not send user option if not set'", (done) ->
    conn = new MockConnection
    cmd = new StartServiceCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData("shell:am startservice
          -n 'com.dummy.component/.Main'").toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Success\n'
      conn.socket.causeEnd()
    options =
      component: 'com.dummy.component/.Main'
    cmd.execute options
      .then ->
        done()
