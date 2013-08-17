Stream = require 'stream'
{EventEmitter} = require 'events'
debug = require('debug')('adb:sync')

Protocol = require './protocol'

class Sync extends EventEmitter
  MODES =
    dir: parseInt '0100', 2
    file: parseInt '1000', 2
    symlink: parseInt '1010', 2

  constructor: (@connection, @parser) ->

  stat: (path, callback) ->
    @parser.readAscii 4, (reply) =>
      switch reply
        when Protocol.STAT
          @parser.readBytes 12, (stat) =>
            callback null,
              mode: stat.readUInt32LE 0
              size: stat.readUInt32LE 4
              time: stat.readUInt32LE 8
        when Protocol.FAIL
          @parser.readError callback
        else
          @parser.unexpected reply, callback
    this._sendCommandWithArg Protocol.STAT, path
    return this

  pushFileStream: (path, inStream, mode, callback) ->
    if typeof mode is 'function'
      callback = mode
      mode = 0o664
    mode += MODES.file << 24
    this._sendCommandWithArg Protocol.SEND, "#{path},#{mode}"
    this._writeData inStream, Math.floor(Date.now() / 1000), callback
    return this

  pullFileStream: (path, callback) ->
    this._sendCommandWithArg Protocol.RECV, "#{path}"
    this._readData new Stream.PassThrough(), callback
    return this

  end: ->
    @connection.end()
    return this

  _writeData: (inStream, timeStamp, callback) ->
    @parser.readAscii 4, (reply) =>
      switch reply
        when Protocol.OKAY
          @parser.readBytes 4, (zero) =>
            callback null
        when Protocol.FAIL
          @parser.readError callback
        else
          @parser.unexpected reply, callback
    inStream.on 'readable', =>
      while chunk = inStream.read()
        this._sendCommandWithLength Protocol.DATA, chunk.length
        @connection.write chunk
    inStream.on 'end', =>
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

module.exports = Sync
