{expect} = require 'chai'

Adb = require '../'
Client = require '../src/adb/client'

describe 'Adb', ->

  describe '@createClient(options)', ->

    it "should return a Client instance", (done) ->
      expect(Adb.createClient()).to.be.an.instanceOf Client
      done()
