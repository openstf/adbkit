Protocol = require './protocol'

class Parser
  constructor: (@stream) ->
    @_needBytes = 0
    @_callback = null
    @_readableListener = null
    @_endListener = null
    this._bind()

  readAscii: (howMany, callback) ->
    this.readBytes howMany, (buf) ->
      setImmediate ->
        callback buf.toString 'ascii'

  readBytes: (howMany, callback) ->
    if howMany is 0
      setImmediate ->
        callback new Buffer ''
    else
      @_needBytes = howMany
      @_callback = callback
      this._read()
    return this

  readValue: (callback) ->
    this.readAscii 4, (value) =>
      length = Protocol.decodeLength value
      this.readBytes length, callback

  readError: (callback) ->
    this.readValue (value) ->
      callback new Error value

  unbind: ->
    @stream.removeListener 'readable', @_readableListener if @_readableListener
    @stream.removeListener 'end', @_endListener if @_endListener
    return this

  raw: ->
    this.unbind()
    @stream.resume()
    return @stream

  _bind: ->
    @stream.on 'readable', @_readableListener = =>
      this._read()
    @stream.pause()
    return this

  _read: ->
    if @_needBytes
      data = @stream.read @_needBytes
      if data is null
        @stream.resume()
      else
        @_needBytes = 0
        setImmediate =>
          callback = @_callback
          @_callback = null
          callback data
        @stream.pause()
    return this

module.exports = Parser
