{expect} = require 'chai'

Adb = require '../'
Client = require '../src/adb/client'
Keycode = require '../src/adb/keycode'
util = require '../src/adb/util'

describe 'Adb', ->

  it "should expose Keycode", (done) ->
    expect(Adb).to.have.property 'Keycode'
    expect(Adb.Keycode).to.equal Keycode
    done()

  it "should expose util", (done) ->
    expect(Adb).to.have.property 'util'
    expect(Adb.util).to.equal util
    done()

  describe '@createClient(options)', ->

    it "should return a Client instance", (done) ->
      expect(Adb.createClient()).to.be.an.instanceOf Client
      done()
