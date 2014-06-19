{EventEmitter} = require 'events'

Parser = require './parser'
Protocol = requir './protocol'

class Tcp extends EventEmitter
  A_SYNC = 0x434e5953
  A_CNXN = 0x4e584e43
  A_OPEN = 0x4e45504f
  A_OKAY = 0x59414b4f
  A_CLSE = 0x45534c43
  A_WRTE = 0x45545257
  A_AUTH = 0x48545541

  class State
    constructor: ->
      @version = 1
      @maxPayload = 4096
      @syncToken = 1
      @remoteId = 1

  constructor: (@client, @serial, @socket) ->
    @parser = new Parser @socket
    @state = new State
    this._inputLoop()

  _inputLoop: ->
    this._readMessage()
      .then (message) =>
        this._handleMessage message
      .finally =>
        setImmediate this._inputLoop.bind(this)

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

  _handleMessage: (message) ->
    switch message.command
      when A_SYNC
        # No need to do anything
        console.log 'A_SYNC', message
        this._writeHeader A_SYNC, 1, ++@state.syncToken, 0
      when A_CNXN
        console.log 'A_CNXN', message
        @state.version = message.arg0
        @state.maxPayload = message.arg1
        @client.getProperties @serial
          .then (properties) =>
            this._writeMessage A_CNXN, @state.version, @state.maxPayload,
              'device::' +　("#{prop}=#{properties[prop]};" for prop in [
                'ro.product.name'
                'ro.product.model'
                'ro.product.device'
              ]).join('')
      when A_OPEN
        # @todo
        console.log 'A_OPEN', message
        localId = message.arg0
        @client.transport @serial
          .then (transport) =>
            service = message.data.slice(0, -1) # Discard null byte at end
            remoteId = ++@state.remoteId

            # Needs ADB proto glue
            transport.write service

            out = transport.parser.raw()

            maybeRead = =>
              while chunk = out.read(@state.maxPayload) or chunk = out.read()
                console.log '>>write', chunk
                this._writeMessage A_WRTE, remoteId, localId, chunk

            end = =>
              this.writeHeader A_CLOSE, remoteId, localId

            out.on 'readable', maybeRead
            out.on 'end', end

            maybeRead()

            this._writeHeader A_OKAY, remoteId, localId
      when A_OKAY
        # @todo
        console.log 'A_OKAY', message
        localId = message.arg0
        remoteId = message.arg1
        true
      when A_CLSE
        console.log 'A_CLSE', message
        localId = message.arg0
        remoteId = message.arg1
        this._writeHeader A_CLSE
      when A_WRTE
        # @todo
        console.log 'A_WRTE', message
        localId = message.arg0
        remoteId = message.arg1
        true
      when A_AUTH
        # We should never get this unless we send it first
        console.log 'A_AUTH', message
        true

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
    unless Buffer.isBuffer data
      data = new Buffer data
    this._writeHeader command, arg0, arg1, data.length, this._checksum data
    @socket.write data

  _validateMessage: (message) ->
    unless message.magic is this._magic message.command
      throw new Error "Command failed magic check"
    sum = this._checksum message.data
    unless sum is message.check
      throw new Error "Message checksum doesn't match received message"
    return message

  _checksum: (data) ->
    unless Buffer.isBuffer data
      throw new Error "Unable to calculate checksum of non-Buffer"
    sum = 0
    sum += char for char in data
    return sum

  _magic: (command) ->
    # We need the full uint32 range, which ">>> 0" thankfully allows us to use
    (command ^ 0xffffffff) >>> 0

Net = require 'net'
Adb = require '../adb'
client = Adb.createClient()
server = Net.createServer()
server.on 'connection', (conn) ->
  new Tcp client, '8a0a640e', conn

  conn.on 'end', ->
    console.log '>> connection ended'

  conn.on 'error', ->
    console.log '>> connection errored', err

server.listen 6677

module.exports = Tcp
