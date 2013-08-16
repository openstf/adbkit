Protocol = require './protocol'

class Parser
  constructor: (@stream) ->

  readAscii: (howMany, callback) ->
    this.readBytes howMany, (buf) ->
      setImmediate ->
        callback buf.toString 'ascii'

  readBytes: (howMany, callback) ->
    this._read howMany, callback

  readValue: (callback) ->
    this.readAscii 4, (value) =>
      length = Protocol.decodeLength value
      this.readBytes length, callback

  readError: (callback) ->
    this.readValue (value) ->
      callback new Error value

  raw: ->
    return @stream

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

module.exports = Parser
