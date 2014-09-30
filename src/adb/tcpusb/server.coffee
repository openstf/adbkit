Net = require 'net'
{EventEmitter} = require 'events'

Socket = require './socket'

class Server extends EventEmitter
  constructor: (@client, @serial, @options) ->
    @connections = []
    @server = Net.createServer()
    @server.on 'error', (err) =>
      this.emit 'error', err
    @server.on 'listening', =>
      this.emit 'listening'
    @server.on 'close', =>
      this.emit 'close'
    @server.on 'connection', (conn) =>
      socket = new Socket @client, @serial, conn, @options
      @connections.push socket
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
