Stream = require 'stream'
Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = Chai

MockConnection = require '../../../mock/connection'
Protocol = require '../../../../src/adb/protocol'
ShellCommand =
  require '../../../../src/adb/command/host-transport/shell'

describe 'ShellCommand', ->

  it "should pass String commands as-is", (done) ->
    conn = new MockConnection
    cmd = new ShellCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('shell:foo \'bar').toString()
      conn.socket.causeEnd()
      done()
    cmd.execute 'foo \'bar', (err) ->
      expect(err).to.be.null
      done()

  it "should escape Array commands", (done) ->
    conn = new MockConnection
    cmd = new ShellCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData("""shell:'foo' ''"'"'bar'"'"'' '"'""").toString()
      conn.socket.causeEnd()
      done()
    cmd.execute ['foo', '\'bar\'', '"'], (err) ->
      expect(err).to.be.null
      done()

  it "should not escape numbers in arguments", (done) ->
    conn = new MockConnection
    cmd = new ShellCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData("""shell:'foo' 67""").toString()
      conn.socket.causeEnd()
      done()
    cmd.execute ['foo', 67], (err) ->
      expect(err).to.be.null
      done()
