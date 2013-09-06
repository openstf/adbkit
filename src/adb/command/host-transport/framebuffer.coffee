Assert = require 'assert'
{spawn} = require 'child_process'
debug = require('debug')('adb:command:framebuffer')

Command = require '../../command'
Protocol = require '../../protocol'
RgbTransform = require '../../framebuffer/rgbtransform'

class FrameBufferCommand extends Command
  execute: (callback) ->
    @parser.readAscii 4, (reply) =>
      switch reply
        when Protocol.OKAY
          @parser.readBytes 52, (header) =>
            info = this._parseHeader header
            switch info.format
              when 'rgb'
                debug "Passing 'rgb' stream as-is"
                raw = @parser.raw()
              else
                debug "Silently transforming '#{info.format}' into 'rgb'"
                transform = new RgbTransform info
                info.format = 'rgb'
                raw = @parser.raw().pipe transform
            callback null, info, this._png info, raw
        when Protocol.FAIL
          @parser.readError callback
        else
          callback this._unexpected reply
    this._send 'framebuffer:'

  _png: (info, raw) ->
    debug "Converting RGB stream into PNG"
    proc = spawn 'gm', [
      'convert'
      '-size'
      "#{info.width}x#{info.height}"
      'rgb:-'
      'png:-'
    ]
    raw.pipe proc.stdin
    return proc.stdout

  _parseHeader: (header) ->
    info = {}
    offset = 0
    info.version = header.readUInt32LE offset
    Assert.ok info.version isnt 16, 'Old-style raw images are not supported'
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
    return info

module.exports = FrameBufferCommand
