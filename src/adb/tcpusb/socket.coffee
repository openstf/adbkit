crypto = require 'crypto'
{EventEmitter} = require 'events'

Promise = require 'bluebird'
Forge = require 'node-forge'
debug = require('debug')('adb:tcpusb:socket')

Parser = require '../parser'
Protocol = require '../protocol'
Auth = require '../auth'
Packet = require './packet'
PacketReader = require './packetreader'
Service = require './service'
ServiceMap = require './servicemap'
RollingCounter = require './rollingcounter'

class Socket extends EventEmitter
  class @AuthError extends Error
    constructor: (@message) ->
      Error.call this
      @name = 'AuthError'
      Error.captureStackTrace this, Socket.AuthError

  class @UnauthorizedError extends Error
    constructor: ->
      Error.call this
      @name = 'UnauthorizedError'
      @message = "Unauthorized access"
      Error.captureStackTrace this, Socket.UnauthorizedError

  UINT32_MAX = 0xFFFFFFFF
  UINT16_MAX = 0xFFFF

  AUTH_TOKEN = 1
  AUTH_SIGNATURE = 2
  AUTH_RSAPUBLICKEY = 3

  TOKEN_LENGTH = 20

  constructor: (@client, @serial, @socket, @options = {}) ->
    @options.auth or= Promise.resolve true
    @ended = false
    @socket.setNoDelay true
    @reader = new PacketReader @socket
      .on 'packet', this._handle.bind(this)
      .on 'error', (err) =>
        debug "PacketReader error: #{err.message}"
        this.end()
      .on 'end', this.end.bind(this)
    @version = 1
    @maxPayload = 4096
    @authorized = false
    @syncToken = new RollingCounter UINT32_MAX
    @remoteId = new RollingCounter UINT32_MAX
    @services = new ServiceMap
    @remoteAddress = @socket.remoteAddress
    @token = null
    @signature = null

  end: ->
    return this if @ended
    # End services first so that they can send a final payload before FIN.
    @services.end()
    @socket.end()
    @ended = true
    this.emit 'end'
    return this

  _error: (err) ->
    this.emit 'error', err
    this.end()

  _handle: (packet) ->
    return if @ended
    this.emit 'userActivity', packet
    Promise.try =>
      switch packet.command
        when Packet.A_SYNC
          this._handleSyncPacket packet
        when Packet.A_CNXN
          this._handleConnectionPacket packet
        when Packet.A_OPEN
          this._handleOpenPacket packet
        when Packet.A_OKAY, Packet.A_WRTE, Packet.A_CLSE
          this._forwardServicePacket packet
        when Packet.A_AUTH
          this._handleAuthPacket packet
        else
          throw new Error "Unknown command #{packet.command}"
    .catch Socket.AuthError, =>
      this.end()
    .catch Socket.UnauthorizedError, =>
      this.end()
    .catch (err) =>
      this._error err

  _handleSyncPacket: (packet) ->
    # No need to do anything?
    debug 'I:A_SYNC'
    debug 'O:A_SYNC'
    this.write Packet.assemble(Packet.A_SYNC, 1, @syncToken.next(), null)

  _handleConnectionPacket: (packet) ->
    debug 'I:A_CNXN', packet
    version = Packet.swap32(packet.arg0)
    @maxPayload = Math.min UINT16_MAX, packet.arg1
    this._createToken()
      .then (@token) =>
        debug 'O:A_AUTH'
        this.write Packet.assemble(Packet.A_AUTH, AUTH_TOKEN, 0, @token)

  _handleAuthPacket: (packet) ->
    debug 'I:A_AUTH', packet
    switch packet.arg0
      when AUTH_SIGNATURE
        # Store first signature, ignore the rest
        @signature = packet.data unless @signature
        debug 'O:A_AUTH'
        this.write Packet.assemble(Packet.A_AUTH, AUTH_TOKEN, 0, @token)
      when AUTH_RSAPUBLICKEY
        unless @signature
          throw new AuthError "Public key sent before signature"
        unless packet.data and packet.data.length >= 2
          throw new AuthError "Empty RSA public key"
        Auth.parsePublicKey this._skipNull(packet.data)
          .then (key) =>
            digest = @token.toString 'binary'
            sig = @signature.toString 'binary'
            unless key.verify digest, sig
              throw new Socket.AuthError "Signature mismatch"
            key
          .then (key) =>
            @options.auth key
              .catch (err) ->
                throw new Socket.AuthError "Rejected by user-defined handler"
          .then =>
            this._deviceId()
          .then (id) =>
            @authorized = true
            debug 'O:A_CNXN'
            this.write Packet.assemble(Packet.A_CNXN,
              Packet.swap32(@version), @maxPayload, id)
      else
        throw new Error "Unknown authentication method #{packet.arg0}"

  _handleOpenPacket: (packet) ->
    throw new Socket.UnauthorizedError() unless @authorized
    remoteId = packet.arg0
    localId = @remoteId.next()
    unless packet.data and packet.data.length >= 2
      throw new Error "Empty service name"
    name = this._skipNull(packet.data)
    debug "Calling #{name}"
    service = new Service @client, @serial, localId, remoteId, this
    new Promise (resolve, reject) =>
      service.on 'error', reject
      service.on 'end', resolve
      @services.insert localId, service
      debug "Handling #{@services.count} services simultaneously"
      service.handle packet
    .catch (err) ->
      true
    .finally =>
      @services.remove localId
      debug "Handling #{@services.count} services simultaneously"
      service.end()

  _forwardServicePacket: (packet) ->
    throw new Socket.UnauthorizedError() unless @authorized
    remoteId = packet.arg0
    localId = packet.arg1
    if service = @services.get localId
      service.handle packet
    else
      debug "Received a packet to a service that may have been closed already"

  write: (chunk) ->
    return if @ended
    @socket.write chunk

  _createToken: ->
    Promise.promisify(crypto.randomBytes)(TOKEN_LENGTH)

  _skipNull: (data) ->
    data.slice 0, -1 # Discard null byte at end

  _deviceId: ->
    debug "Loading device properties to form a standard device ID"
    @client.getProperties @serial
      .then (properties) ->
        id = ("#{prop}=#{properties[prop]};" for prop in [
          'ro.product.name'
          'ro.product.model'
          'ro.product.device'
        ]).join('')
        new Buffer "device::#{id}\0"

module.exports = Socket
