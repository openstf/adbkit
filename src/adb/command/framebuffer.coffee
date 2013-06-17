Command = require '../command'
Protocol = require '../protocol'

class FrameBufferCommand extends Command
  execute: (callback) ->
    @parser.readAscii 4, (reply) =>
      switch reply
        when Protocol.OKAY
          @parser.readBytes 52, (header) =>
            parsed = this._parseHeaderheader
            callback null, parsed, @parser.raw()
        when Protocol.FAIL
          @parser.readError callback
        else
          callback this._unexpected reply
    this._send 'framebuffer:'

  _parseHeader: (header) ->
    offset = 0
    info.version = header.readUInt32LE offset
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
    info.format += 'a' if info.alpha_offset
    return info

module.exports = FrameBufferCommand
