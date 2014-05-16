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
        Protocol.encodeData('shell:pm clear foo.bar.c').toString()
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Success\r\n'
      conn.socket.causeEnd()
    cmd.execute 'foo.bar.c'
      .then ->
        done()

  it "should succeed on 'Success'", (done) ->
    conn = new MockConnection
    cmd = new ClearCommand conn
    conn.socket.on 'write', (chunk) ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Success\r\n'
      conn.socket.causeEnd()
    cmd.execute 'foo.bar.c'
      .then ->
        done()

  it "should error on 'Failed'", (done) ->
    conn = new MockConnection
    cmd = new ClearCommand conn
    conn.socket.on 'write', (chunk) ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Failed\r\n'
      conn.socket.causeEnd()
    cmd.execute 'foo.bar.c'
      .catch (err) ->
        expect(err).to.be.an.instanceof Error
        done()

  it "should error on 'Failed' even if connection not closed by
      device", (done) ->
    conn = new MockConnection
    cmd = new ClearCommand conn
    conn.socket.on 'write', (chunk) ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Failed\r\n'
    cmd.execute 'foo.bar.c'
      .catch (err) ->
        expect(err).to.be.an.instanceof Error
        done()

  it "should ignore irrelevant lines", (done) ->
    conn = new MockConnection
    cmd = new ClearCommand conn
    conn.socket.on 'write', (chunk) ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Open: foo error\n\n'
      conn.socket.causeRead 'Success\r\n'
      conn.socket.causeEnd()
    cmd.execute 'foo.bar.c'
      .then ->
        done()
