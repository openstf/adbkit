Stream = require 'stream'
Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = Chai

LineTransform = require '../../src/adb/linetransform'
MockDuplex = require '../mock/duplex'

describe 'LineTransform', ->

  it "should implement stream.Transform", (done) ->
    expect(new LineTransform).to.be.an.instanceOf Stream.Transform
    done()

  it "should not modify data that does not have 0x0d 0x0a in it", (done) ->
    duplex = new MockDuplex
    transform = new LineTransform
    transform.on 'data', (data) ->
      expect(data.toString()).to.equal 'foo'
      done()
    duplex.pipe transform
    duplex.causeRead 'foo'
    duplex.causeEnd()

  it "should not remove 0x0d if not followed by 0x0a", (done) ->
    duplex = new MockDuplex
    transform = new LineTransform
    transform.on 'data', (data) ->
      expect(data.length).to.equal 2
      expect(data[0]).to.equal 0x0d
      expect(data[1]).to.equal 0x05
      done()
    duplex.pipe transform
    duplex.causeRead new Buffer [0x0d, 0x05]
    duplex.causeEnd()

  it "should remove 0x0d if followed by 0x0a", (done) ->
    duplex = new MockDuplex
    transform = new LineTransform
    transform.on 'data', (data) ->
      expect(data.length).to.equal 2
      expect(data[0]).to.equal 0x0a
      expect(data[1]).to.equal 0x97
      done()
    duplex.pipe transform
    duplex.causeRead new Buffer [0x0d, 0x0a, 0x97]
    duplex.causeEnd()

  it "should push 0x0d without 0x0a if last in stream", (done) ->
    duplex = new MockDuplex
    transform = new LineTransform
    transform.on 'data', (data) ->
      expect(data.length).to.equal 1
      expect(data[0]).to.equal 0x0d
      done()
    duplex.pipe transform
    duplex.causeRead new Buffer [0x0d]
    duplex.causeEnd()

  it "should push saved 0x0d if next chunk does not start with 0x0a", (done) ->
    duplex = new MockDuplex
    transform = new LineTransform
    buffer = new Buffer ''
    transform.on 'data', (data) ->
      buffer = Buffer.concat [buffer, data]
    transform.on 'end', ->
      expect(buffer).to.have.length 3
      expect(buffer[0]).to.equal 0x62
      expect(buffer[1]).to.equal 0x0d
      expect(buffer[2]).to.equal 0x37
      done()
    duplex.pipe transform
    duplex.causeRead new Buffer [0x62, 0x0d]
    duplex.causeRead new Buffer [0x37]
    duplex.causeEnd()
    duplex.end()

  it "should remove saved 0x0d if next chunk starts with 0x0a", (done) ->
    duplex = new MockDuplex
    transform = new LineTransform
    buffer = new Buffer ''
    transform.on 'data', (data) ->
      buffer = Buffer.concat [buffer, data]
    transform.on 'end', ->
      expect(buffer).to.have.length 2
      expect(buffer[0]).to.equal 0x62
      expect(buffer[1]).to.equal 0x0a
      done()
    duplex.pipe transform
    duplex.causeRead new Buffer [0x62, 0x0d]
    duplex.causeRead new Buffer [0x0a]
    duplex.causeEnd()
    duplex.end()
