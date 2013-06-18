{expect} = require 'chai'

Adb = require '../'
Client = require '../src/adb/client'
Keycode = require '../src/adb/keycode'

describe 'Adb', ->

  it "should expose Keycode", (done) ->
    expect(Adb).to.have.property 'Keycode'
    expect(Adb.Keycode).to.equal Keycode
    done()

  describe '@createClient(options)', ->

    it "should return a Client instance", (done) ->
      expect(Adb.createClient()).to.be.an.instanceOf Client
      done()
