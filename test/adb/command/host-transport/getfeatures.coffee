Stream = require 'stream'
Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = Chai

MockConnection = require '../../../mock/connection'
Protocol = require '../../../../src/adb/protocol'
GetFeaturesCommand =
  require '../../../../src/adb/command/host-transport/getfeatures'

describe 'GetFeaturesCommand', ->

  it "should send 'pm list features'", (done) ->
    conn = new MockConnection
    cmd = new GetFeaturesCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('shell:pm list features 2>/dev/null').toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeEnd()
    cmd.execute()
      .then ->
        done()

  it "should return an empty object for an empty feature list", (done) ->
    conn = new MockConnection
    cmd = new GetFeaturesCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeEnd()
    cmd.execute()
      .then (features) ->
        expect(Object.keys(features)).to.be.empty
        done()

  it "should return a map of features", (done) ->
    conn = new MockConnection
    cmd = new GetFeaturesCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead """
        feature:reqGlEsVersion=0x20000
        feature:foo\r
        feature:bar
        """
      conn.socket.causeEnd()
    cmd.execute()
      .then (features) ->
        expect(Object.keys(features)).to.have.length 3
        expect(features).to.eql
          reqGlEsVersion: '0x20000'
          foo: true
          bar: true
        done()
