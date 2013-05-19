Net = require 'net'
{EventEmitter} = require 'events'

class Connection extends EventEmitter
  constructor: (@options) ->
    @socket = null

  connect: ->
    @socket = Net.connect @options
    @socket.on 'connect', =>
      this.emit 'connect'
    @socket.on 'end', =>
      this.emit 'end'
    @socket.on 'timeout', =>
      this.emit 'timeout'
    @socket.on 'error', (err) =>
      this._handleError err
    @socket.on 'close', (hadError) =>
      this.emit 'close', hadError
    return

  end: ->
    @socket.end()
    return

  _handleError: (err) ->
    this.emit 'error', err
    this.end()
    return

module.exports = Connection
