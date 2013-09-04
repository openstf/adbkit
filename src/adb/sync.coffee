Fs = require 'fs'
Path = require 'path'
{EventEmitter} = require 'events'
debug = require('debug')('adb:sync')
once = require 'once'

Protocol = require './protocol'
Stats = require './sync/stats'
PushTransfer = require './sync/pushtransfer'
PullTransfer = require './sync/pulltransfer'

class Sync extends EventEmitter
  TEMP_PATH = '/data/local/tmp'
  DEFAULT_CHMOD = 0o644
  DATA_MAX_LENGTH = 65536

  @temp: (path) ->
    "#{TEMP_PATH}/#{Path.basename path}"

  constructor: (@connection, @parser) ->

  stat: (path, callback) ->
    @parser.readAscii 4, (reply) =>
      switch reply
        when Protocol.STAT
          @parser.readBytes 12, (stat) =>
            mode = stat.readUInt32LE 0
            size = stat.readUInt32LE 4
            mtime = stat.readUInt32LE 8
            if mode is 0
              callback this._enoent path
            else
              callback null, new Stats mode, size, mtime
        when Protocol.FAIL
          this._readError callback
        else
          @parser.unexpected reply, callback
    this._sendCommandWithArg Protocol.STAT, path
    return this

  push: (contents, path, mode, callback) ->
    if typeof contents is 'string'
      return this.pushFile contents, path, mode, callback
    this.pushStream contents, path, mode, callback

  pushFile: (file, path, mode, callback) ->
    if typeof mode is 'function'
      callback = mode
      mode = undefined
    mode or= DEFAULT_CHMOD
    this.pushStream Fs.createReadStream(file), path, mode, callback

  pushStream: (stream, path, mode, callback) ->
    if typeof mode is 'function'
      callback = mode
      mode = undefined
    mode or= DEFAULT_CHMOD
    mode |= Stats.S_IFREG
    this._sendCommandWithArg Protocol.SEND, "#{path},#{mode}"
    this._writeData stream, Math.floor(Date.now() / 1000), callback

  pull: (path, callback) ->
    this._sendCommandWithArg Protocol.RECV, "#{path}"
    this._readData callback

  end: ->
    @connection.end()
    return this

  tempFile: (path) ->
    Sync.temp path

  _writeData: (stream, timeStamp, callback) ->
    callback = once callback if callback
    transfer = new PushTransfer
    transfer.on 'cancel', =>
      stream.end()
      @connection.end()
    @parser.readAscii 4, (reply) =>
      switch reply
        when Protocol.OKAY
          @parser.readBytes 4, (zero) ->
            transfer.end()
        when Protocol.FAIL
          this._readError (err) ->
            transfer.emit 'error', err
            callback err if callback
        else
          @parser.unexpected reply, (err) ->
            transfer.emit 'error', err
            callback err if callback
    saturated = false
    track = ->
      transfer.pop()
    write = =>
      unless saturated
        # Try to read the maximum supported amount first. If not available,
        # just use whatever we have.
        while chunk = stream.read(DATA_MAX_LENGTH) or stream.read()
          this._sendCommandWithLength Protocol.DATA, chunk.length
          transfer.push chunk.length
          unless @connection.write(chunk, track)
            saturated = true
            stream.once 'drain', ->
              saturated = false
              write()
    stream.on 'readable', write
    stream.on 'end', =>
      this._sendCommandWithLength Protocol.DONE, timeStamp
    stream.on 'error', (err) ->
      transfer.emit 'error', err
      callback err if callback
    if callback
      setImmediate ->
        callback null, transfer
    return transfer

  _readData: (callback) ->
    callback = once callback if callback
    transfer = new PullTransfer
    transfer.on 'cancel', =>
      @connection.end()
    readBlock = =>
      @parser.readAscii 4, (reply) =>
        switch reply
          when Protocol.DATA
            callback null, transfer if callback
            @parser.readBytes 4, (lengthData) =>
              length = lengthData.readUInt32LE 0
              @parser.readByteFlow length, (chunk, final) =>
                transfer.write chunk
                setImmediate readBlock if final
          when Protocol.DONE
            @parser.readBytes 4, (zero) =>
              transfer.end()
          when Protocol.FAIL
            this._readError (err) ->
              transfer.emit 'error', err
              callback err if callback
          else
            @parser.unexpected reply, (err) ->
              transfer.emit 'error', err
              callback err if callback
    readBlock()
    return transfer

  _readError: (callback) ->
    @parser.readBytes 4, (zero) =>
      @parser.readAll (buf) =>
        callback new Error buf.toString()

  _sendCommandWithLength: (cmd, length) ->
    debug cmd unless cmd is Protocol.DATA
    payload = new Buffer cmd.length + 4
    payload.write cmd, 0, cmd.length
    payload.writeUInt32LE length, cmd.length
    @connection.write payload

  _sendCommandWithArg: (cmd, arg) ->
    debug "#{cmd} #{arg}"
    payload = new Buffer cmd.length + 4 + arg.length
    pos = 0
    payload.write cmd, pos, cmd.length
    pos += cmd.length
    payload.writeUInt32LE arg.length, pos
    pos += 4
    payload.write arg, pos
    @connection.write payload

  _enoent: (path) ->
    err = new Error "ENOENT, no such file or directory '#{path}'"
    err.errno = 34
    err.code = 'ENOENT'
    err.path = path
    return err

module.exports = Sync
