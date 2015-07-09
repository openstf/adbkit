{EventEmitter} = require 'events'

Promise = require 'bluebird'
debug = require('debug')('adb:tcpusb:service')

Parser = require '../parser'
Protocol = require '../protocol'
Packet = require './packet'

class Service extends EventEmitter
  class @PrematurePacketError extends Error
    constructor: (@packet) ->
      Error.call this
      @name = 'PrematureActionError'
      @message = "Premature packet"
      Error.captureStackTrace this, Service.PrematureActionError

  class @LateTransportError extends Error
    constructor: ->
      Error.call this
      @name = 'LateTransportError'
      @message = "Late transport"
      Error.captureStackTrace this, Service.LateTransportError

  constructor: (@client, @serial, @localId, @remoteId, @socket) ->
    super()
    @opened = false
    @ended = false
    @transport = null
    @needAck = false

  end: ->
    @transport.end() if @transport
    return this if @ended
    debug 'O:A_CLSE'
    localId = if @opened then @localId else 0 # Zero can only mean a failed open
    @socket.write Packet.assemble(Packet.A_CLSE, localId, @remoteId, null)
    @transport = null
    @ended = true
    this.emit 'end'
    return this

  handle: (packet) ->
    Promise.try =>
      switch packet.command
        when Packet.A_OPEN
          this._handleOpenPacket(packet)
        when Packet.A_OKAY
          this._handleOkayPacket(packet)
        when Packet.A_WRTE
          this._handleWritePacket(packet)
        when Packet.A_CLSE
          this._handleClosePacket(packet)
        else
          throw new Error "Unexpected packet #{packet.command}"
    .catch (err) =>
      this.emit 'error', err
      this.end()

  _handleOpenPacket: (packet) ->
    debug 'I:A_OPEN', packet
    @client.transport @serial
      .then (@transport) =>
        throw new LateTransportError() if @ended
        @transport.write Protocol.encodeData packet.data.slice(0, -1) # Discard null byte at end
        @transport.parser.readAscii 4
          .then (reply) =>
            switch reply
              when Protocol.OKAY
                debug 'O:A_OKAY'
                @socket.write Packet.assemble(Packet.A_OKAY, @localId, @remoteId, null)
                @opened = true
              when Protocol.FAIL
                @transport.parser.readError()
              else
                @transport.parser.unexpected reply, 'OKAY or FAIL'
      .then =>
        new Promise (resolve, reject) =>
          @transport.socket
            .on 'readable', => this._tryPush()
            .on 'end', resolve
            .on 'error', reject
          this._tryPush()
      .finally =>
        this.end()

  _handleOkayPacket: (packet) ->
    debug 'I:A_OKAY', packet
    return if @ended
    throw new Service.PrematurePacketError(packet) unless @transport
    @needAck = false
    this._tryPush()

  _handleWritePacket: (packet) ->
    debug 'I:A_WRTE', packet
    return if @ended
    throw new Service.PrematurePacketError(packet) unless @transport
    @transport.write packet.data if packet.data
    debug 'O:A_OKAY'
    @socket.write Packet.assemble(Packet.A_OKAY, @localId, @remoteId, null)

  _handleClosePacket: (packet) ->
    debug 'I:A_CLSE', packet
    return if @ended
    throw new Service.PrematurePacketError(packet) unless @transport
    this.end()

  _tryPush: ->
    return if @needAck or @ended
    if chunk = this._readChunk(@transport.socket)
      debug 'O:A_WRTE'
      @socket.write Packet.assemble(Packet.A_WRTE, @localId, @remoteId, chunk)
      @needAck = true

  _readChunk: (stream) ->
    stream.read(@socket.maxPayload) or stream.read()

module.exports = Service
