Protocol = require './protocol'

class Parser
  constructor: (@stream) ->
    @_buffer = new Buffer ''
    @_needBytes = 0
    @_callback = null
    @_dataListener = null
    this._bind()

  readAscii: (howMany, callback) ->
    this.readBytes howMany, (buf) ->
      setImmediate ->
        callback buf.toString 'ascii'

  readBytes: (howMany, callback) ->
    @_needBytes = howMany
    @_callback = callback
    if @_buffer.length >= @_needBytes
      this._read()
    else
      @stream.resume()
    return this

  readValue: (callback) ->
    this.readAscii 4, (length) =>
      this.readBytes Protocol.decodeLength(length), callback

  unbind: ->
    @stream.removeListener 'data', @_dataListener
    return this

  _bind: ->
    @stream.on 'data', @_dataListener = (chunk) =>
      this._parse chunk
    @stream.pause()
    return this

  _parse: (chunk) ->
    @_buffer = Buffer.concat [@_buffer, chunk]
    this._read()
    return this

  _read: ->
    if @_buffer.length >= @_needBytes
      data = @_buffer.slice 0, @_needBytes
      @_buffer = @_buffer.slice @_needBytes
      setImmediate =>
        @_callback data
      @stream.pause()
    return this

module.exports = Parser
