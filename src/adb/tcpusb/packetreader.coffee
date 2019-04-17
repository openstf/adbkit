{EventEmitter} = require 'events'

Packet = require './packet'

class PacketReader extends EventEmitter
  constructor: (@stream) ->
    super()
    @inBody = false
    @buffer = null
    @packet = null
    @stream.on 'readable', this._tryRead.bind(this)
    @stream.on 'error', (err) => this.emit 'error', err
    @stream.on 'end', => this.emit 'end'
    setImmediate this._tryRead.bind(this)

  _tryRead: ->
    while this._appendChunk()
      while @buffer
        if @inBody
          break unless @buffer.length >= @packet.length
          @packet.data = this._consume(@packet.length)
          unless @packet.verifyChecksum()
            this.emit 'error', new PacketReader.ChecksumError(@packet)
            return
          this.emit 'packet', @packet
          @inBody = false
        else
          break unless @buffer.length >= 24
          header = this._consume(24)
          @packet = new Packet(
            header.readUInt32LE 0
            header.readUInt32LE 4
            header.readUInt32LE 8
            header.readUInt32LE 12
            header.readUInt32LE 16
            header.readUInt32LE 20
            new Buffer(0)
          )
          unless @packet.verifyMagic()
            this.emit 'error', new PacketReader.MagicError(@packet)
            return
          if @packet.length is 0
            this.emit 'packet', @packet
          else
            @inBody = true

  _appendChunk: ->
    if chunk = @stream.read()
      if @buffer
        @buffer = Buffer.concat([@buffer, chunk], @buffer.length + chunk.length)
      else
        @buffer = chunk
    else
      null

  _consume: (length) ->
    chunk = @buffer.slice(0, length)
    @buffer = if length is @buffer.length then null else @buffer.slice(length)
    chunk

class PacketReader.ChecksumError extends Error
  constructor: (@packet) ->
    Error.call this
    @name = 'ChecksumError'
    @message = "Checksum mismatch"
    Error.captureStackTrace this, PacketReader.ChecksumError

class PacketReader.MagicError extends Error
  constructor: (@packet) ->
    Error.call this
    @name = 'MagicError'
    @message = "Magic value mismatch"
    Error.captureStackTrace this, PacketReader.MagicError

module.exports = PacketReader
