Stream = require 'stream'
Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = Chai

MockConnection = require '../../../mock/connection'
Protocol = require '../../../../src/adb/protocol'
GetPropertiesCommand =
  require '../../../../src/adb/command/host-transport/getproperties'

describe 'GetPropertiesCommand', ->

  it "should send 'getprop'", (done) ->
    conn = new MockConnection
    cmd = new GetPropertiesCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('shell:getprop').toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeEnd()
    cmd.execute()
      .then ->
        done()

  it "should return an empty object for an empty property list", (done) ->
    conn = new MockConnection
    cmd = new GetPropertiesCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeEnd()
    cmd.execute()
      .then (properties) ->
        expect(Object.keys(properties)).to.be.empty
        done()

  it "should return a map of properties", (done) ->
    conn = new MockConnection
    cmd = new GetPropertiesCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead """
        [ro.product.locale.region]: [US]
        [ro.product.manufacturer]: [samsung]\r
        [ro.product.model]: [SC-04E]
        [ro.product.name]: [SC-04E]
        """
      conn.socket.causeEnd()
    cmd.execute()
      .then (properties) ->
        expect(Object.keys(properties)).to.have.length 4
        expect(properties).to.eql
          'ro.product.locale.region': 'US'
          'ro.product.manufacturer': 'samsung'
          'ro.product.model': 'SC-04E'
          'ro.product.name': 'SC-04E'
        done()
