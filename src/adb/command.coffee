debug = require('debug')('adb:command')

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
    encoded = Protocol.encodeData data
    debug "Send '#{encoded}'"
    @connection.socket.write encoded
    return this

module.exports = Command
