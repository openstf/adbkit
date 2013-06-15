Stream = require 'stream'
{expect} = require 'chai'

Parser = require '../../src/adb/parser'
Protocol = require '../../src/adb/protocol'

describe.only 'Parser', ->

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

  it "should read as many ascii characters as requested", (done) ->
    stream = new Stream.PassThrough
    parser = new Parser stream
    parser.readAscii 4, (str) ->
      expect(str.length).to.equal 4
      expect(str).to.equal 'OKAY'
      done()
    stream.write 'OKAYFAIL'

  it "should wait for enough bytes to appear", (done) ->
    stream = new Stream.PassThrough
    parser = new Parser stream
    parser.readBytes 5, (buf) ->
      expect(buf.toString()).to.equal 'BYTES'
      done()
    setTimeout ->
      stream.write 'BYTES'
    , 50

  it "should pause stream when nothing has been requested", (done) ->
    stream = new Stream.PassThrough
    parser = new Parser stream
    stream.write 'FOO'
    setTimeout ->
      parser.readBytes 2, (buf) ->
        expect(buf.length).to.equal 2
        expect(buf.toString()).to.equal 'FO'
        done()
    , 50
