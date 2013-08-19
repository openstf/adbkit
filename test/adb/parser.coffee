Stream = require 'stream'
Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = require 'chai'

Parser = require '../../src/adb/parser'

describe 'Parser', ->

  describe 'readBytes(howMany, callback)', ->

    it "should read as many bytes as requested", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      parser.readBytes 4, (buf) ->
        expect(buf.length).to.equal 4
        expect(buf.toString()).to.equal 'OKAY'
        parser.readBytes 2, (buf) ->
          expect(buf).to.have.length 2
          expect(buf.toString()).to.equal 'FA'
          done()
      stream.write 'OKAYFAIL'

  describe 'readByteFlow(maxHowMany, callback)', ->

    it "should read as many bytes as requested", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      parser.readByteFlow 4, (buf) ->
        expect(buf.length).to.equal 4
        expect(buf.toString()).to.equal 'OKAY'
        parser.readByteFlow 2, (buf) ->
          expect(buf).to.have.length 2
          expect(buf.toString()).to.equal 'FA'
          done()
      stream.write 'OKAYFAIL'

    it "should call callback with new/partial chunk until maxHowMany", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      spy = Sinon.spy()
      parser.readByteFlow 3, spy
      b1 = new Buffer 'P'
      b2 = new Buffer 'I'
      b3 = new Buffer 'ES'
      b4 = new Buffer 'R'
      stream.write b1
      stream.write b2
      stream.write b3
      stream.write b4
      expect(spy).to.have.been.calledThrice
      expect(spy).to.have.been.calledWith b1, false
      expect(spy).to.have.been.calledWith b2, false
      expect(spy.thirdCall.args).to.eql [new Buffer('E'), true]
      done()

    it "should give callback a 2nd parameter to indicate last chunk", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      spy = Sinon.spy()
      parser.readByteFlow 3, spy
      b1 = new Buffer 'P'
      b2 = new Buffer 'I'
      b3 = new Buffer 'E'
      b4 = new Buffer 'S'
      stream.write b1
      stream.write b2
      stream.write b3
      stream.write b4
      expect(spy).to.have.been.calledThrice
      expect(spy).to.have.been.calledWith b1, false
      expect(spy).to.have.been.calledWith b2, false
      expect(spy).to.have.been.calledWith b3, true
      done()

  describe 'readAscii(howMany, callback)', ->

    it "should read as many ascii characters as requested", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      parser.readAscii 4, (str) ->
        expect(str.length).to.equal 4
        expect(str).to.equal 'OKAY'
        done()
      stream.write 'OKAYFAIL'

  describe 'readValue(callback)', ->

    it "should read a protocol value as a Buffer", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      parser.readValue (value) ->
        expect(value).to.be.an.instanceOf Buffer
        expect(value).to.have.length 4
        expect(value.toString()).to.equal '001f'
        done()
      stream.write '0004001f'

    it "should return an empty value", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      parser.readValue (value) ->
        expect(value).to.be.an.instanceOf Buffer
        expect(value).to.have.length 0
        done()
      stream.write '0000'

  describe 'readError(callback)', ->

    it "should read a value as an Error", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      parser.readError (err) ->
        expect(err).to.be.an.instanceOf Error
        expect(err.message).to.equal 'epic failure'
        done()
      stream.write '000cepic failure'

  describe 'skipLine(callback)', ->

    it "should skip a line terminated by \\n", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      parser.skipLine ->
        parser.readBytes 7, (buf) ->
          expect(buf.toString()).to.equal 'zip zap'
          done()
      stream.write 'foo bar\nzip zap\npip pop'

  describe 'raw()', ->

    it "should return the resumed raw stream", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      raw = parser.raw()
      expect(raw).to.equal stream
      raw.on 'data', ->
        done()
      raw.write 'foo'

  it "should wait for enough data to appear", (done) ->
    stream = new Stream.PassThrough
    parser = new Parser stream
    parser.readBytes 5, (buf) ->
      expect(buf.toString()).to.equal 'BYTES'
      done()
    setTimeout ->
      stream.write 'BYTES'
    , 50

  it "should keep data waiting even when nothing has been requested", (done) ->
    stream = new Stream.PassThrough
    parser = new Parser stream
    stream.write 'FOO'
    setTimeout ->
      parser.readBytes 2, (buf) ->
        expect(buf.length).to.equal 2
        expect(buf.toString()).to.equal 'FO'
        done()
    , 50
