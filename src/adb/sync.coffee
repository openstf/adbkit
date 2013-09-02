Stream = require 'stream'
Fs = require 'fs'
Path = require 'path'
{EventEmitter} = require 'events'
debug = require('debug')('adb:sync')

Protocol = require './protocol'
Stats = require './sync/stats'

class Sync extends EventEmitter
  TEMP = '/data/local/tmp'
  DEFAULT_CHMOD = 0o644

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
          @parser.readError callback
        else
          @parser.unexpected reply, callback
    this._sendCommandWithArg Protocol.STAT, path
    return this

  push: (path, contents, mode, callback) ->
    if typeof contents is 'string'
      return this.pushFile path, contents, mode, callback
    this.pushStream path, contents, mode, callback

  pushFile: (path, file, mode, callback) ->
    if typeof mode is 'function'
      callback = mode
      mode = undefined
    mode or= DEFAULT_CHMOD
    reader = Fs.createReadStream file
    reader.on 'open', =>
      this.pushStream path, reader, mode, callback
    reader.on 'error', callback
    return this

  pushStream: (path, stream, mode, callback) ->
    if typeof mode is 'function'
      callback = mode
      mode = undefined
    mode or= DEFAULT_CHMOD
    mode |= Stats.S_IFREG
    this._sendCommandWithArg Protocol.SEND, "#{path},#{mode}"
    this._writeData stream, Math.floor(Date.now() / 1000), callback
    return this

  pull: (path, callback) ->
    this._sendCommandWithArg Protocol.RECV, "#{path}"
    this._readData new Stream.PassThrough(), callback
    return this

  end: ->
    @connection.end()
    return this

  tempFile: (path) ->
    "#{TEMP}/#{Path.basename path}"

  _writeData: (stream, timeStamp, callback) ->
    @parser.readAscii 4, (reply) =>
      switch reply
        when Protocol.OKAY
          @parser.readBytes 4, (zero) =>
            callback null
        when Protocol.FAIL
          @parser.readError callback
        else
          @parser.unexpected reply, callback
    saturated = false
    write = =>
      unless saturated
        while chunk = stream.read()
          this._sendCommandWithLength Protocol.DATA, chunk.length
          unless @connection.write chunk
            saturated = true
            stream.once 'drain', ->
              saturated = false
              write()
    stream.on 'readable', write
    stream.on 'end', =>
      this._sendCommandWithLength Protocol.DONE, timeStamp
    return this

  _readData: (outStream, callback) ->
    @parser.readAscii 4, (reply) =>
      switch reply
        when Protocol.DATA
          callback null, outStream
          @parser.readBytes 4, (lengthData) =>
            length = lengthData.readUInt32LE 0
            @parser.readByteFlow length, (chunk, final) =>
              outStream.write chunk
              if final
                setImmediate =>
                  this._readData outStream, ->
        when Protocol.DONE
          @parser.readBytes 4, (zero) =>
            outStream.end()
            callback null
        when Protocol.FAIL
          @parser.readError callback
        else
          @parser.unexpected reply, callback

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
