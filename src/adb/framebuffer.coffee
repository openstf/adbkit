{EventEmitter} = require 'events'

class FrameBuffer extends EventEmitter
  FETCH_BYTE = new Buffer 1

  constructor: (@connection) ->
    @parser = @connection.parser
    @info = {}
    this._readHeader()

  snapshot: (callback) ->
    @parser.readBytes @info.size, callback
    @connection.write FETCH_BYTE
    return this

  end: ->
    @connection.end()
    return this

  _readHeader: (callback) ->
    @parser.readBytes 52, (header) =>
      offset = 0
      @info.version = header.readUInt32LE offset
      offset += 4
      @info.bpp = header.readUInt32LE offset
      offset += 4
      @info.size = header.readUInt32LE offset
      offset += 4
      @info.width = header.readUInt32LE offset
      offset += 4
      @info.height = header.readUInt32LE offset
      offset += 4
      @info.red_offset = header.readUInt32LE offset
      offset += 4
      @info.red_length = header.readUInt32LE offset
      offset += 4
      @info.blue_offset = header.readUInt32LE offset
      offset += 4
      @info.blue_length = header.readUInt32LE offset
      offset += 4
      @info.green_offset = header.readUInt32LE offset
      offset += 4
      @info.green_length = header.readUInt32LE offset
      offset += 4
      @info.alpha_offset = header.readUInt32LE offset
      offset += 4
      @info.alpha_length = header.readUInt32LE offset
      this.emit 'ready'
    return this

module.exports = FrameBuffer
