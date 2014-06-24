{EventEmitter} = require 'events'

Promise = require 'bluebird'
debug = require('debug')('adb:tcpusb:socket')

Parser = require '../parser'
Protocol = require '../protocol'

class Socket extends EventEmitter
  A_SYNC = 0x434e5953
  A_CNXN = 0x4e584e43
  A_OPEN = 0x4e45504f
  A_OKAY = 0x59414b4f
  A_CLSE = 0x45534c43
  A_WRTE = 0x45545257
  A_AUTH = 0x48545541
  UINT32_MAX = 0xFFFFFFFF

  constructor: (@client, @serial, @socket) ->
    @ended = false
    @parser = new Parser @socket
    @version = 1
    @maxPayload = 4096
    @authorized = false
    @syncToken = new RollingCounter UINT32_MAX
    @remoteId = new RollingCounter UINT32_MAX
    @services = new ServiceMap
    @remoteAddress = @socket.remoteAddress
    this._inputLoop()

  end: ->
    unless @ended
      @socket.end()
      @services.end()
      this.emit 'end'
      @ended = true
    return this

  _inputLoop: ->
    this._readMessage()
      .then (message) =>
        this._route message
      .then =>
        setImmediate this._inputLoop.bind this
      .catch Parser.PrematureEOFError, =>
        # This means `adb disconnect`
        this.end()

  _readMessage: ->
    @parser.readBytes 24
      .then (header) ->
        command: header.readUInt32LE 0
        arg0: header.readUInt32LE 4
        arg1: header.readUInt32LE 8
        length: header.readUInt32LE 12
        check: header.readUInt32LE 16
        magic: header.readUInt32LE 20
      .then (message) =>
        @parser.readBytes message.length
          .then (data) ->
            message.data = data
            return message
      .then (message) =>
        this._validateMessage message

  _route: (message) ->
    switch message.command
      when A_SYNC
        this._handleSyncMessage message
      when A_CNXN
        this._handleConnectionMessage message
      when A_OPEN
        this._handleOpenMessage message
      when A_OKAY
        this._handleOkayMessage message
      when A_CLSE
        this._handleCloseMessage message
      when A_WRTE
        this._handleWriteMessage message
      when A_AUTH
        this._handleAuthMessage message
      else
        this.emit 'error', new Error "Unknown command #{message.command}"

  _handleSyncMessage: (message) ->
    # No need to do anything?
    this._writeHeader A_SYNC, 1, @syncToken.next(), 0

  _handleConnectionMessage: (message) ->
    debug 'A_CNXN', message
    @version = message.arg0
    @maxPayload = message.arg1
    @client.getProperties @serial
      .then (properties) =>
        @authorized = true
        this._writeMessage A_CNXN, @version, @maxPayload,
          'device::' +　("#{prop}=#{properties[prop]};" for prop in [
            'ro.product.name'
            'ro.product.model'
            'ro.product.device'
          ]).join ''
      .catch (err) =>
        this.emit 'error', err
        this.end()

  _handleOpenMessage: (message) ->
    return unless @authorized
    debug 'A_OPEN', message
    localId = message.arg0
    remoteId = @remoteId.next()
    service = message.data.slice 0, -1 # Discard null byte at end
    command = service.toString().split(':', 1)[0]
    @client.transport @serial
      .then (transport) =>
        debug "Calling #{service}"

        @services.put remoteId, transport
        transport.write Protocol.encodeData service
        parser = transport.parser

        pump = =>
          new Promise (resolve, reject) =>
            out = parser.raw()
            maybeRead = =>
              while chunk = this._readChunk out
                this._writeMessage A_WRTE, remoteId, localId, chunk
            out.on 'readable', maybeRead
            out.on 'end', resolve

        parser.readAscii 4
          .then (reply) =>
            switch reply
              when Protocol.OKAY
                this._writeHeader A_OKAY, remoteId, localId
                pump()
              when Protocol.FAIL
                parser.readError()
              else
                parser.unexpected reply, 'OKAY or FAIL'
          .catch Parser.PrematureEOFError, ->
            true
          .finally =>
            this._close remoteId, localId
          .catch Parser.FailError, (err) =>
            debug "Unable to open transport: #{err}"
            this.end()

        # At this point we are ready to accept new messages, so let's return
        return

  _handleOkayMessage: (message) ->
    return unless @authorized
    debug 'A_OKAY', message
    # We should wait until an OKAY is received to WRTE more, but we don't
    # really care about that.
    localId = message.arg0
    remoteId = message.arg1

  _handleCloseMessage: (message) ->
    return unless @authorized
    debug 'A_CLSE', message
    localId = message.arg0
    remoteId = message.arg1
    this._close remoteId, localId

  _handleWriteMessage: (message) ->
    return unless @authorized
    debug 'A_WRTE', message
    # @todo
    localId = message.arg0
    remoteId = message.arg1
    if remote = @services.get remoteId
      remote.write message.data
      this._writeHeader A_OKAY, remoteId, localId
    else
      debug "A_WRTE to unknown socket pair #{localId}/#{remoteId}"
    true

  _handleAuthMessage: (message) ->
    debug 'A_AUTH', message
    # We should never get this unless we send it first, and we don't
    true

  _close: (remoteId, localId) ->
    if remote = @services.remove remoteId
      remote.end()
      this._writeHeader A_CLSE, remoteId, localId

  _writeHeader: (command, arg0, arg1, length, checksum) ->
    header = new Buffer 24
    header.writeUInt32LE command, 0
    header.writeUInt32LE arg0 || 0, 4
    header.writeUInt32LE arg1 || 0, 8
    header.writeUInt32LE length || 0, 12
    header.writeUInt32LE checksum || 0, 16
    header.writeUInt32LE this._magic(command), 20
    @socket.write header

  _writeMessage: (command, arg0, arg1, data) ->
    data = new Buffer data unless Buffer.isBuffer data
    this._writeHeader command, arg0, arg1, data.length, this._checksum data
    @socket.write data

  _validateMessage: (message) ->
    unless message.magic is this._magic message.command
      throw new Error "Command failed magic check"
    unless message.check is this._checksum message.data
      throw new Error "Message checksum doesn't match received message"
    return message

  _readChunk: (stream) ->
    stream.read(@maxPayload) or stream.read()

  _checksum: (data) ->
    unless Buffer.isBuffer data
      throw new Error "Unable to calculate checksum of non-Buffer"
    sum = 0
    sum += char for char in data
    return sum

  _magic: (command) ->
    # We need the full uint32 range, which ">>> 0" thankfully allows us to use
    (command ^ 0xffffffff) >>> 0

  class RollingCounter
    constructor: (@max, @min = 1) ->
      @now = @min

    next: ->
      @now = @min unless @now < @max
      return ++@now

  class ServiceMap
    constructor: ->
      @remotes = Object.create null

    end: ->
      for remoteId, remote of @remotes
        remote.end()
      @remotes = Object.create null
      return

    put: (remoteId, socket) ->
      @remotes[remoteId] = socket

    get: (remoteId) ->
      @remotes[remoteId] or null

    remove: (remoteId) ->
      if remote = @remotes[remoteId]
        delete @remotes[remoteId]
        remote
      else
        null

module.exports = Socket
