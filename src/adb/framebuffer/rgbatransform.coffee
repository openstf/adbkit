Assert = require 'assert'
Stream = require 'stream'

class RgbaTransform extends Stream.Transform
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
    cursor = 0
    target = if @_pixel_bytes is 4 \
      then @_buffer
      else new Buffer Math.max 4, chunk.length / @_pixel_bytes * 4
    while @_buffer.length - cursor >= @_pixel_bytes
      r = @_buffer[cursor + @_r_pos]
      g = @_buffer[cursor + @_g_pos]
      b = @_buffer[cursor + @_b_pos]
      target[cursor + 3] = if @meta.alpha_length \
        then @_buffer[@_a_pos]
        else 0xFF
      target[cursor + 0] = r
      target[cursor + 1] = g
      target[cursor + 2] = b
      cursor += 4
    if cursor
      this.push target.slice 0, cursor
      @_buffer = @_buffer.slice cursor
    done()
    return

module.exports = RgbaTransform
