Stream = require 'stream'

class RgbaTransform extends Stream.Transform
  constructor: (@meta, options) ->
    @_buffer = new Buffer ''
    # We only support 8 bits per pixel
    @_red_start = @meta.red_offset / 8
    @_red_end = (@meta.red_offset + @meta.red_length) / 8
    @_green_start = @meta.green_offset / 8
    @_green_end = (@meta.green_offset + @meta.green_length) / 8
    @_blue_start = @meta.blue_offset / 8
    @_blue_end = (@meta.blue_offset + @meta.blue_length) / 8
    @_alpha_start = @meta.alpha_offset / 8
    @_alpha_end = (@meta.alpha_offset + @meta.alpha_length) / 8
    @_pixel_bytes = @meta.bpp / 8
    super options

  _transform: (chunk, encoding, done) ->
    if @_buffer.length
      @_buffer = Buffer.concat [@_buffer, chunk], @_buffer.length + chunk.length
    else
      @_buffer = chunk
    while @_buffer.length >= @_pixel_bytes
      pixel = new Buffer 4
      @_buffer.copy pixel, 0, @_red_start, @_red_end
      @_buffer.copy pixel, 1, @_green_start, @_green_end
      @_buffer.copy pixel, 2, @_blue_start, @_blue_end
      if @meta.alpha_length
        @_buffer.copy pixel, 3, @_alpha_start, @_alpha_end
      else
        pixel.writeUInt8 0xFF, 3
      this.push pixel
      @_buffer = @_buffer.slice @_pixel_bytes
    done()
    return

module.exports = RgbaTransform
