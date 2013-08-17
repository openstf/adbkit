Protocol = require './protocol'

class Parser
  constructor: (@stream) ->

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

  raw: ->
    return @stream

  unexpected: (reply, callback) ->
    callback new Error "Unexpected reply: '#{reply}'"
    return this

  _read: (howMany, callback) ->
    if howMany
      if chunk = @stream.read howMany
        setImmediate =>
          callback chunk
      else
        @stream.once 'readable', =>
          this._read howMany, callback
    else
      callback new Buffer 0
    return this

  _readFlow: (howMany, callback) ->
    if howMany
      while chunk = @stream.read()
        if chunk.length > howMany
          @stream.push chunk.slice howMany
          chunk = chunk.slice 0, howMany
        howMany -= chunk.length
        if howMany is 0
          setImmediate =>
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
