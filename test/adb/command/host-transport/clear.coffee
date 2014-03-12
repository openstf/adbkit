Stream = require 'stream'
Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = Chai

MockConnection = require '../../../mock/connection'
Protocol = require '../../../../src/adb/protocol'
ClearCommand = require '../../../../src/adb/command/host-transport/clear'

describe 'ClearCommand', ->

  it "should send 'pm clear <pkg>'", (done) ->
    conn = new MockConnection
    cmd = new ClearCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('shell:pm clear foo.bar.c 2>/dev/null').toString()
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Success'
      conn.socket.causeEnd()
    cmd.execute 'foo.bar.c'
      .then ->
        done()

  it "should callback with error on failure", (done) ->
    conn = new MockConnection
    cmd = new ClearCommand conn
    conn.socket.on 'write', (chunk) ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Failed'
      conn.socket.causeEnd()
    cmd.execute 'foo.bar.c'
      .catch (err) ->
        expect(err).to.be.an.instanceof Error
        done()

  it "should callback with error on failure even if not closed", (done) ->
    conn = new MockConnection
    cmd = new ClearCommand conn
    conn.socket.on 'write', (chunk) ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Failed'
    cmd.execute 'foo.bar.c'
      .catch (err) ->
        expect(err).to.be.an.instanceof Error
        done()

  it "should callback with error if unexpected output", (done) ->
    conn = new MockConnection
    cmd = new ClearCommand conn
    conn.socket.on 'write', (chunk) ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'bar'
      conn.socket.causeEnd()
    cmd.execute 'foo.bar.c'
      .catch (err) ->
        expect(err).to.be.an.instanceof Error
        done()
