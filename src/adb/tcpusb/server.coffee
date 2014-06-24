Net = require 'net'
{EventEmitter} = require 'events'

Socket = require './socket'

class Server extends EventEmitter
  constructor: (@client, @serial) ->
    @server = Net.createServer()
    @server.on 'error', (err) =>
      this.emit 'error', err
    @server.on 'listening', =>
      this.emit 'listening'
    @server.on 'close', =>
      this.emit 'close'
    @server.on 'connection', (conn) =>
      this.emit 'connection', new Socket @client, @serial, conn

  listen: ->
    @server.listen.apply @server, arguments
    return this

  close: ->
    @server.close()
    return this

module.exports = Server
