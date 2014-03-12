Stream = require 'stream'
Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = Chai

MockConnection = require '../../../mock/connection'
Protocol = require '../../../../src/adb/protocol'
Parser = require '../../../../src/adb/parser'
ShellCommand =
  require '../../../../src/adb/command/host-transport/shell'

describe 'ShellCommand', ->

  it "should pass String commands as-is", (done) ->
    conn = new MockConnection
    cmd = new ShellCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('shell:foo \'bar').toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeEnd()
    cmd.execute 'foo \'bar'
      .then (out) ->
        done()

  it "should escape Array commands", (done) ->
    conn = new MockConnection
    cmd = new ShellCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData("""shell:'foo' ''"'"'bar'"'"'' '"'""").toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeEnd()
    cmd.execute ['foo', '\'bar\'', '"']
      .then (out) ->
        done()

  it "should not escape numbers in arguments", (done) ->
    conn = new MockConnection
    cmd = new ShellCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData("""shell:'foo' 67""").toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeEnd()
    cmd.execute ['foo', 67]
      .then (out) ->
        done()

  it "should reject with FailError on ADB failure (not command
      failure)", (done) ->
    conn = new MockConnection
    cmd = new ShellCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData("""shell:'foo'""").toString()
    setImmediate ->
      conn.socket.causeRead Protocol.FAIL
      conn.socket.causeRead Protocol.encodeData 'mystery'
      conn.socket.causeEnd()
    cmd.execute ['foo']
      .catch Parser.FailError, (err) ->
        done()
