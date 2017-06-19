Stream = require 'stream'
Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = Chai

MockConnection = require '../../../mock/connection'
Protocol = require '../../../../src/adb/protocol'
GetPackagesCommand =
  require '../../../../src/adb/command/host-transport/getpackages'

describe 'GetPackagesCommand', ->

  it "should send 'pm list packages'", (done) ->
    conn = new MockConnection
    cmd = new GetPackagesCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('shell:pm list packages 2>/dev/null').toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeEnd()
    cmd.execute()
      .then ->
        done()

  it "should return an empty array for an empty package list", (done) ->
    conn = new MockConnection
    cmd = new GetPackagesCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeEnd()
    cmd.execute()
      .then (packages) ->
        expect(packages).to.be.empty
        done()

  it "should return an array of packages", (done) ->
    conn = new MockConnection
    cmd = new GetPackagesCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead """
        package:com.google.android.gm
        package:com.google.android.inputmethod.japanese
        package:com.google.android.tag\r
        package:com.google.android.GoogleCamera
        package:com.google.android.youtube
        package:com.google.android.apps.magazines
        package:com.google.earth
        """
      conn.socket.causeEnd()
    cmd.execute()
      .then (packages) ->
        expect(packages).to.have.length 7
        expect(packages).to.eql [
          'com.google.android.gm'
          'com.google.android.inputmethod.japanese'
          'com.google.android.tag'
          'com.google.android.GoogleCamera',
          'com.google.android.youtube',
          'com.google.android.apps.magazines',
          'com.google.earth'
        ]
        done()
