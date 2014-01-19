Assert = require 'assert'
{spawn} = require 'child_process'
debug = require('debug')('adb:command:framebuffer')

Command = require '../../command'
Protocol = require '../../protocol'
RgbTransform = require '../../framebuffer/rgbtransform'

class FrameBufferCommand extends Command
  execute: (format, callback) ->
    @parser.readAscii 4, (reply) =>
      switch reply
        when Protocol.OKAY
          @parser.readBytes 52, (header) =>
            this._parseHeader header, (err, info) =>
              return callback err if err
              switch format
                when 'raw'
                  callback null, info, @parser.raw()
                else
                  callback null, info, this._convert info, format, @parser.raw()
        when Protocol.FAIL
          @parser.readError callback
        else
          callback this._unexpected reply
    this._send 'framebuffer:'

  _convert: (info, format, raw) ->
    debug "Converting raw framebuffer stream into #{format.toUpperCase()}"
    switch info.format
      when 'rgb', 'rgba'
        # Known to be supported by GraphicsMagick
      else
        debug "Silently transforming '#{info.format}' into 'rgb' for `gm`"
        transform = new RgbTransform info
        info.format = 'rgb'
        raw = @parser.raw().pipe transform
    proc = spawn 'gm', [
      'convert'
      '-size'
      "#{info.width}x#{info.height}"
      "#{info.format}:-"
      "#{format}:-"
    ]
    raw.pipe proc.stdin
    return proc.stdout

  _parseHeader: (header, callback) ->
    info = {}
    offset = 0
    info.version = header.readUInt32LE offset
    if info.version is 16
      return callback new Error 'Old-style raw images are not supported'
    offset += 4
    info.bpp = header.readUInt32LE offset
    offset += 4
    info.size = header.readUInt32LE offset
    offset += 4
    info.width = header.readUInt32LE offset
    offset += 4
    info.height = header.readUInt32LE offset
    offset += 4
    info.red_offset = header.readUInt32LE offset
    offset += 4
    info.red_length = header.readUInt32LE offset
    offset += 4
    info.blue_offset = header.readUInt32LE offset
    offset += 4
    info.blue_length = header.readUInt32LE offset
    offset += 4
    info.green_offset = header.readUInt32LE offset
    offset += 4
    info.green_length = header.readUInt32LE offset
    offset += 4
    info.alpha_offset = header.readUInt32LE offset
    offset += 4
    info.alpha_length = header.readUInt32LE offset
    info.format = if info.blue_offset is 0 then 'bgr' else 'rgb'
    info.format += 'a' if info.bpp is 32 or info.alpha_length
    callback null, info

module.exports = FrameBufferCommand
