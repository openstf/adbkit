{expect} = require 'chai'

Protocol = require '../../src/adb/protocol'

describe 'Protocol', ->

  it "should expose a 'FAIL' property", (done) ->
    expect(Protocol).to.have.property 'FAIL'
    expect(Protocol.FAIL).to.equal 'FAIL'
    done()

  it "should expose an 'OKAY' property", (done) ->
    expect(Protocol).to.have.property 'OKAY'
    expect(Protocol.OKAY).to.equal 'OKAY'
    done()

  describe '@decodeLength(length)', ->

    it "should return a Number", (done) ->
      expect(Protocol.decodeLength '0x0046').to.be.a 'number'
      done()

    it "should accept a hexadecimal string", (done) ->
      expect(Protocol.decodeLength '0x5887').to.equal 0x5887
      done()

  describe '@encodeLength(length)', ->

    it "should return a String", (done) ->
      expect(Protocol.encodeLength 27).to.be.a 'string'
      done()

    it "should return a valid hexadecimal number", (done) ->
      expect(parseInt Protocol.encodeLength(32), 16).to.equal 32
      expect(parseInt Protocol.encodeLength(9999), 16).to.equal 9999
      done()

    it "should return uppercase hexadecimal digits", (done) ->
      expect(Protocol.encodeLength(0x0abc)).to.equal '0ABC'
      done()

    it "should pad short values with zeroes for a 4-byte size", (done) ->
      expect(Protocol.encodeLength 1).to.have.length 4
      expect(Protocol.encodeLength 2).to.have.length 4
      expect(Protocol.encodeLength 57).to.have.length 4
      done()

    it "should return 0000 for 0 length", (done) ->
      expect(Protocol.encodeLength 0).to.equal '0000'
      done()

  describe '@encodeData(data)', ->

    it "should return a Buffer", (done) ->
      expect(Protocol.encodeData new Buffer '').to.be.an.instanceOf Buffer
      done()

    it "should accept a string or a Buffer", (done) ->
      expect(Protocol.encodeData '').to.be.an.instanceOf Buffer
      expect(Protocol.encodeData new Buffer '').to.be.an.instanceOf Buffer
      done()

    it "should prefix data with length", (done) ->
      data = Protocol.encodeData new Buffer 0x270F
      expect(data).to.have.length 0x270F + 4
      expect(data.toString 'ascii', 0, 4).to.equal '270F'
      done()
