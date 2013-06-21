Stream = require 'stream'
Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = Chai

RgbTransform = require '../../../src/adb/framebuffer/rgbtransform'

describe 'RgbTransform', ->

  it "should transform BGRA into RGB", (done) ->
    meta =
      bpp: 32
      red_offset: 16
      red_length: 8
      green_offset: 8
      green_length: 8
      blue_offset: 0
      blue_length: 8
      alpha_offset: 24
      alpha_length: 8
    pixel = new Buffer 4
    pixel.writeUInt8 50, 0
    pixel.writeUInt8 100, 1
    pixel.writeUInt8 150, 2
    pixel.writeUInt8 200, 3
    stream = new Stream.PassThrough
    transform = new RgbTransform meta
    stream.pipe transform
    transform.on 'data', (chunk) ->
      expect(chunk).to.have.length 3
      expect(chunk.readUInt8 0).to.equal 150
      expect(chunk.readUInt8 1).to.equal 100
      expect(chunk.readUInt8 2).to.equal 50
      done()
    stream.write pixel
    stream.end()

  it "should transform BGR into RGB", (done) ->
    meta =
      bpp: 32
      red_offset: 16
      red_length: 8
      green_offset: 8
      green_length: 8
      blue_offset: 0
      blue_length: 8
      alpha_offset: 0
      alpha_length: 0
    pixel = new Buffer 4
    pixel.writeUInt8 50, 0
    pixel.writeUInt8 100, 1
    pixel.writeUInt8 150, 2
    stream = new Stream.PassThrough
    transform = new RgbTransform meta
    stream.pipe transform
    transform.on 'data', (chunk) ->
      expect(chunk).to.have.length 3
      expect(chunk.readUInt8 0).to.equal 150
      expect(chunk.readUInt8 1).to.equal 100
      expect(chunk.readUInt8 2).to.equal 50
      done()
    stream.write pixel
    stream.end()

  it "should transform RGB into RGB", (done) ->
    meta =
      bpp: 24
      red_offset: 0
      red_length: 8
      green_offset: 8
      green_length: 8
      blue_offset: 16
      blue_length: 8
      alpha_offset: 0
      alpha_length: 0
    pixel = new Buffer 3
    pixel.writeUInt8 50, 0
    pixel.writeUInt8 100, 1
    pixel.writeUInt8 150, 2
    stream = new Stream.PassThrough
    transform = new RgbTransform meta
    stream.pipe transform
    transform.on 'data', (chunk) ->
      expect(chunk).to.have.length 3
      expect(chunk.readUInt8 0).to.equal 50
      expect(chunk.readUInt8 1).to.equal 100
      expect(chunk.readUInt8 2).to.equal 150
      done()
    stream.write pixel
    stream.end()

  it "should transform RGBA into RGB", (done) ->
    meta =
      bpp: 32
      red_offset: 0
      red_length: 8
      green_offset: 8
      green_length: 8
      blue_offset: 16
      blue_length: 8
      alpha_offset: 24
      alpha_length: 8
    pixel = new Buffer 4
    pixel.writeUInt8 50, 0
    pixel.writeUInt8 100, 1
    pixel.writeUInt8 150, 2
    pixel.writeUInt8 200, 3
    stream = new Stream.PassThrough
    transform = new RgbTransform meta
    stream.pipe transform
    transform.on 'data', (chunk) ->
      expect(chunk).to.have.length 3
      expect(chunk.readUInt8 0).to.equal 50
      expect(chunk.readUInt8 1).to.equal 100
      expect(chunk.readUInt8 2).to.equal 150
      done()
    stream.write pixel
    stream.end()

  it "should wait for a complete pixel before transforming", (done) ->
    meta =
      bpp: 32
      red_offset: 0
      red_length: 8
      green_offset: 8
      green_length: 8
      blue_offset: 16
      blue_length: 8
      alpha_offset: 24
      alpha_length: 8
    pixel = new Buffer 4
    pixel.writeUInt8 50, 0
    pixel.writeUInt8 100, 1
    pixel.writeUInt8 150, 2
    pixel.writeUInt8 200, 3
    stream = new Stream.PassThrough
    transform = new RgbTransform meta
    stream.pipe transform
    transform.on 'data', (chunk) ->
      expect(chunk).to.have.length 3
      expect(chunk.readUInt8 0).to.equal 50
      expect(chunk.readUInt8 1).to.equal 100
      expect(chunk.readUInt8 2).to.equal 150
      done()
    stream.write pixel.slice 0, 2
    stream.write pixel.slice 2, 3
    stream.write pixel.slice 3, 4
    stream.end()

  it "should transform a stream of multiple pixels", (done) ->
    meta =
      bpp: 32
      red_offset: 16
      red_length: 8
      green_offset: 8
      green_length: 8
      blue_offset: 0
      blue_length: 8
      alpha_offset: 24
      alpha_length: 8
    pixel1 = new Buffer 4
    pixel1.writeUInt8 50, 0
    pixel1.writeUInt8 100, 1
    pixel1.writeUInt8 150, 2
    pixel1.writeUInt8 200, 3
    pixel2 = new Buffer 4
    pixel2.writeUInt8 51, 0
    pixel2.writeUInt8 101, 1
    pixel2.writeUInt8 151, 2
    pixel2.writeUInt8 201, 3
    stream = new Stream.PassThrough
    transform = new RgbTransform meta
    stream.pipe transform
    all = new Buffer ''
    transform.on 'data', (chunk) ->
      all = Buffer.concat [all, chunk]
    transform.on 'end', ->
      expect(all).to.have.length 15
      expect(all.readUInt8 0).to.equal 150
      expect(all.readUInt8 1).to.equal 100
      expect(all.readUInt8 2).to.equal 50
      expect(all.readUInt8 3).to.equal 151
      expect(all.readUInt8 4).to.equal 101
      expect(all.readUInt8 5).to.equal 51
      done()
    stream.write pixel1
    stream.write pixel2
    stream.write pixel1
    stream.write pixel2
    stream.write pixel1
    stream.end()
