Fs = require 'fs'
Path = require 'path'
Promise = require 'bluebird'
{EventEmitter} = require 'events'
debug = require('debug')('adb:sync')

Parser = require './parser'
Protocol = require './protocol'
Stats = require './sync/stats'
Entry = require './sync/entry'
PushTransfer = require './sync/pushtransfer'
PullTransfer = require './sync/pulltransfer'

class Sync extends EventEmitter
  TEMP_PATH = '/data/local/tmp'
  DEFAULT_CHMOD = 0o644
  DATA_MAX_LENGTH = 65536

  @temp: (path) ->
    "#{TEMP_PATH}/#{Path.basename path}"

  constructor: (@connection) ->
    @parser = @connection.parser

  stat: (path, callback) ->
    this._sendCommandWithArg Protocol.STAT, path
    @parser.readAscii 4
      .then (reply) =>
        switch reply
          when Protocol.STAT
            @parser.readBytes 12
              .then (stat) =>
                mode = stat.readUInt32LE 0
                size = stat.readUInt32LE 4
                mtime = stat.readUInt32LE 8
                if mode is 0
                  this._enoent path
                else
                  new Stats mode, size, mtime
          when Protocol.FAIL
            this._readError()
          else
            @parser.unexpected reply, 'STAT or FAIL'
      .nodeify callback

  readdir: (path, callback) ->
    files = []

    readNext = =>
      @parser.readAscii 4
        .then (reply) =>
          switch reply
            when Protocol.DENT
              @parser.readBytes 16
                .then (stat) =>
                  mode = stat.readUInt32LE 0
                  size = stat.readUInt32LE 4
                  mtime = stat.readUInt32LE 8
                  namelen = stat.readUInt32LE 12
                  @parser.readBytes namelen
                    .then (name) ->
                      name = name.toString()
                      # Skip '.' and '..' to match Node's fs.readdir().
                      unless name is '.' or name is '..'
                        files.push new Entry name, mode, size, mtime
                      readNext()
            when Protocol.DONE
              @parser.readBytes 16
                .then (zero) ->
                  files
            when Protocol.FAIL
              this._readError()
            else
              @parser.unexpected reply, 'DENT, DONE or FAIL'

    this._sendCommandWithArg Protocol.LIST, path

    readNext()
      .nodeify callback

  push: (contents, path, mode) ->
    if typeof contents is 'string'
      this.pushFile contents, path, mode
    else
      this.pushStream contents, path, mode

  pushFile: (file, path, mode = DEFAULT_CHMOD) ->
    mode or= DEFAULT_CHMOD
    this.pushStream Fs.createReadStream(file), path, mode

  pushStream: (stream, path, mode = DEFAULT_CHMOD) ->
    mode |= Stats.S_IFREG
    this._sendCommandWithArg Protocol.SEND, "#{path},#{mode}"
    this._writeData stream, Math.floor(Date.now() / 1000)

  pull: (path) ->
    this._sendCommandWithArg Protocol.RECV, "#{path}"
    this._readData()

  end: ->
    @connection.end()
    return this

  tempFile: (path) ->
    Sync.temp path

  _writeData: (stream, timeStamp) ->
    transfer = new PushTransfer

    writeData = =>
      resolver = Promise.defer()
      writer = Promise.resolve()
        .cancellable()

      stream.on 'end', endListener = =>
        writer.then =>
          this._sendCommandWithLength Protocol.DONE, timeStamp
          resolver.resolve()

      waitForDrain = =>
        resolver = Promise.defer()

        @connection.on 'drain', drainListener = ->
          resolver.resolve()

        resolver.promise.finally =>
          @connection.removeListener 'drain', drainListener

      track = ->
        transfer.pop()

      writeNext = =>
        if chunk = stream.read(DATA_MAX_LENGTH) or stream.read()
          this._sendCommandWithLength Protocol.DATA, chunk.length
          transfer.push chunk.length
          if @connection.write chunk, track
            writeNext()
          else
            waitForDrain()
              .then writeNext
        else
          Promise.resolve()

      stream.on 'readable', readableListener = ->
        writer.then writeNext

      stream.on 'error', errorListener = (err) ->
        resolver.reject err

      @connection.on 'error', connErrorListener = (err) =>
        stream.destroy(err)
        @connection.end()
        resolver.reject err

      resolver.promise.finally =>
        stream.removeListener 'end', endListener
        stream.removeListener 'readable', readableListener
        stream.removeListener 'error', errorListener
        @connection.removeListener 'error', connErrorListener
        writer.cancel()

    readReply = =>
      @parser.readAscii 4
        .then (reply) =>
          switch reply
            when Protocol.OKAY
              @parser.readBytes 4
                .then (zero) ->
                  true
            when Protocol.FAIL
              this._readError()
            else
              @parser.unexpected reply, 'OKAY or FAIL'

    # While I can't think of a case that would break this double-Promise
    # writer-reader arrangement right now, it's not immediately obvious
    # that the code is correct and it may or may not have some failing
    # edge cases. Refactor pending.

    writer = writeData()
      .cancellable()
      .catch Promise.CancellationError, (err) =>
        @connection.end()
      .catch (err) ->
        transfer.emit 'error', err
        reader.cancel()

    reader = readReply()
      .cancellable()
      .catch Promise.CancellationError, (err) ->
        true
      .catch (err) ->
        transfer.emit 'error', err
        writer.cancel()
      .finally ->
        transfer.end()

    transfer.on 'cancel', ->
      writer.cancel()
      reader.cancel()

    return transfer

  _readData: ->
    transfer = new PullTransfer

    readNext = =>
      @parser.readAscii 4
        .cancellable()
        .then (reply) =>
          switch reply
            when Protocol.DATA
              @parser.readBytes 4
                .then (lengthData) =>
                  length = lengthData.readUInt32LE 0
                  @parser.readByteFlow(length, transfer)
                    .then readNext
            when Protocol.DONE
              @parser.readBytes 4
                .then (zero) ->
                  true
            when Protocol.FAIL
              this._readError()
            else
              @parser.unexpected reply, 'DATA, DONE or FAIL'

    reader = readNext()
      .catch Promise.CancellationError, (err) =>
        @connection.end()
      .catch (err) ->
        transfer.emit 'error', err
      .finally ->
        transfer.removeListener 'cancel', cancelListener
        transfer.end()

    transfer.on 'cancel', cancelListener = ->
      reader.cancel()

    return transfer

  _readError: ->
    @parser.readBytes 4
      .then (length) =>
        @parser.readBytes length.readUInt32LE(0)
          .then (buf) ->
            Promise.reject new Parser.FailError buf.toString()
      .finally =>
        @parser.end()

  _sendCommandWithLength: (cmd, length) ->
    debug cmd unless cmd is Protocol.DATA
    payload = new Buffer cmd.length + 4
    payload.write cmd, 0, cmd.length
    payload.writeUInt32LE length, cmd.length
    @connection.write payload

  _sendCommandWithArg: (cmd, arg) ->
    debug "#{cmd} #{arg}"
    arglen = Buffer.byteLength arg, 'utf-8'
    payload = new Buffer cmd.length + 4 + arglen
    pos = 0
    payload.write cmd, pos, cmd.length
    pos += cmd.length
    payload.writeUInt32LE arglen, pos
    pos += 4
    payload.write arg, pos
    @connection.write payload

  _enoent: (path) ->
    err = new Error "ENOENT, no such file or directory '#{path}'"
    err.errno = 34
    err.code = 'ENOENT'
    err.path = path
    Promise.reject err

module.exports = Sync
