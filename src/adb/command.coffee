Parser = require './parser'
Protocol = require './protocol'

class Command
  constructor: (@connection) ->
    @parser = @connection.parser
    @protocol = Protocol

  execute: (callback) ->
    throw new Exception 'Missing implementation'

  _unexpected: (data) ->
    new Error "Unexpected response data: '#{data}'"

  _send: (data) ->
    @connection.socket.write Protocol.encodeData data
    return this

module.exports = Command
