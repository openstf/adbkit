Assert = require 'assert'
Stream = require 'stream'

class RgbTransform extends Stream.Transform
  constructor: (@meta, options) ->
    @_buffer = new Buffer ''
    Assert.ok (@meta.bpp is 24 or @meta.bpp is 32),
      'Only 24-bit and 32-bit raw images with 8-bits per color are supported'
    @_r_pos = @meta.red_offset / 8
    @_g_pos = @meta.green_offset / 8
    @_b_pos = @meta.blue_offset / 8
    @_a_pos = @meta.alpha_offset / 8
    @_pixel_bytes = @meta.bpp / 8
    super options

  _transform: (chunk, encoding, done) ->
    if @_buffer.length
      @_buffer = Buffer.concat [@_buffer, chunk], @_buffer.length + chunk.length
    else
      @_buffer = chunk
    sourceCursor = 0
    targetCursor = 0
    target = if @_pixel_bytes is 3 \
      then @_buffer
      else new Buffer Math.max 4, chunk.length / @_pixel_bytes * 3
    while @_buffer.length - sourceCursor >= @_pixel_bytes
      r = @_buffer[sourceCursor + @_r_pos]
      g = @_buffer[sourceCursor + @_g_pos]
      b = @_buffer[sourceCursor + @_b_pos]
      target[targetCursor + 0] = r
      target[targetCursor + 1] = g
      target[targetCursor + 2] = b
      sourceCursor += @_pixel_bytes
      targetCursor += 3
    if targetCursor
      this.push target.slice 0, targetCursor
      @_buffer = @_buffer.slice sourceCursor
    done()
    return

module.exports = RgbTransform
