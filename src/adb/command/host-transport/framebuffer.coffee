Assert = require 'assert'
{spawn} = require 'child_process'
debug = require('debug')('adb:command:framebuffer')

Command = require '../../command'
Protocol = require '../../protocol'
RgbTransform = require '../../framebuffer/rgbtransform'

class FrameBufferCommand extends Command
  execute: (format) ->
    this._send 'framebuffer:'
    @parser.readAscii 4
      .then (reply) =>
        switch reply
          when Protocol.OKAY
            @parser.readBytes 52
              .then (header) =>
                meta = this._parseHeader header
                switch format
                  when 'raw'
                    stream = @parser.raw()
                    stream.meta = meta
                    stream
                  else
                    stream = this._convert meta, format
                    stream.meta = meta
                    stream
          when Protocol.FAIL
            @parser.readError()
          else
            @parser.unexpected reply, 'OKAY or FAIL'

  _convert: (meta, format, raw) ->
    debug "Converting raw framebuffer stream into #{format.toUpperCase()}"
    switch meta.format
      when 'rgb', 'rgba'
        # Known to be supported by GraphicsMagick
      else
        debug "Silently transforming '#{meta.format}' into 'rgb' for `gm`"
        transform = new RgbTransform meta
        meta.format = 'rgb'
        raw = @parser.raw().pipe transform
    proc = spawn 'gm', [
      'convert'
      '-size'
      "#{meta.width}x#{meta.height}"
      "#{meta.format}:-"
      "#{format}:-"
    ]
    raw.pipe proc.stdin
    return proc.stdout

  _parseHeader: (header) ->
    meta = {}
    offset = 0
    meta.version = header.readUInt32LE offset
    if meta.version is 16
      throw new Error 'Old-style raw images are not supported'
    offset += 4
    meta.bpp = header.readUInt32LE offset
    offset += 4
    meta.size = header.readUInt32LE offset
    offset += 4
    meta.width = header.readUInt32LE offset
    offset += 4
    meta.height = header.readUInt32LE offset
    offset += 4
    meta.red_offset = header.readUInt32LE offset
    offset += 4
    meta.red_length = header.readUInt32LE offset
    offset += 4
    meta.blue_offset = header.readUInt32LE offset
    offset += 4
    meta.blue_length = header.readUInt32LE offset
    offset += 4
    meta.green_offset = header.readUInt32LE offset
    offset += 4
    meta.green_length = header.readUInt32LE offset
    offset += 4
    meta.alpha_offset = header.readUInt32LE offset
    offset += 4
    meta.alpha_length = header.readUInt32LE offset
    meta.format = if meta.blue_offset is 0 then 'bgr' else 'rgb'
    meta.format += 'a' if meta.bpp is 32 or meta.alpha_length
    return meta

module.exports = FrameBufferCommand
