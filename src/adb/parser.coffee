Protocol = require './protocol'

class Parser
  constructor: (@stream) ->

  readAll: (callback) ->
    buf = new Buffer 0
    @stream.on 'data', (chunk) ->
      buf = Buffer.concat [buf, chunk]
    @stream.on 'end', ->
      callback buf

  readAscii: (howMany, callback) ->
    this.readBytes howMany, (buf) ->
      setImmediate ->
        callback buf.toString 'ascii'

  readBytes: (howMany, callback) ->
    this._read howMany, callback

  readByteFlow: (howManyMax, callback) ->
    this._readFlow howManyMax, callback

  readValue: (callback) ->
    this.readAscii 4, (value) =>
      length = Protocol.decodeLength value
      this.readBytes length, callback

  readError: (callback) ->
    this.readValue (value) ->
      callback new Error value

  skipLine: (callback) ->
    consume = =>
      this.readBytes 1, (buf) ->
        if buf[0] is 0x0a
          callback()
        else
          consume()
    consume()
    return this

  raw: ->
    return @stream

  unexpected: (reply, callback) ->
    callback new Error "Unexpected reply: '#{reply}'"
    return this

  _read: (howMany, callback) ->
    if howMany
      if chunk = @stream.read howMany
        callback chunk
      else
        @stream.once 'readable', =>
          this._read howMany, callback
    else
      callback new Buffer 0
    return this

  _readFlow: (howMany, callback) ->
    if howMany
      # Try to get the exact amount we need first. If unsuccessful, take
      # whatever is available.
      while chunk = @stream.read(howMany) or @stream.read()
        howMany -= chunk.length
        if howMany is 0
          callback chunk, true
          break
        callback chunk, false
      if howMany
        @stream.once 'readable', =>
          this._readFlow howMany, callback
    else
      callback new Buffer(0), true
    return this

module.exports = Parser
