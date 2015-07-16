Net = require 'net'
{EventEmitter} = require 'events'

Socket = require './socket'

class Server extends EventEmitter
  constructor: (@client, @serial, @options) ->
    @connections = []
    @server = Net.createServer allowHalfOpen: true
    @server.on 'error', (err) =>
      this.emit 'error', err
    @server.on 'listening', =>
      this.emit 'listening'
    @server.on 'close', =>
      this.emit 'close'
    @server.on 'connection', (conn) =>
      socket = new Socket @client, @serial, conn, @options
      @connections.push socket
      socket.on 'error', (err) =>
        # 'conn' is guaranteed to get ended
        this.emit 'error', err
      socket.once 'end', =>
        # 'conn' is guaranteed to get ended
        @connections = @connections.filter (val) -> val isnt socket
      this.emit 'connection', socket

  listen: ->
    @server.listen.apply @server, arguments
    return this

  close: ->
    @server.close()
    return this

  end: ->
    conn.end() for conn in @connections
    return this

module.exports = Server
