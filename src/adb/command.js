debug = require('debug')('adb:command')

Parser = require './parser'
Protocol = require './protocol'

class Command
  RE_SQUOT = /'/g
  RE_ESCAPE = /([$`\\!"])/g

  constructor: (@connection) ->
    @parser = @connection.parser
    @protocol = Protocol

  execute: ->
    throw new Exception 'Missing implementation'

  _send: (data) ->
    encoded = Protocol.encodeData data
    debug "Send '#{encoded}'"
    @connection.write encoded
    return this

  # Note that this is just for convenience, not security.
  _escape: (arg) ->
    switch typeof arg
      when 'number'
        arg
      else
        "'" + arg.toString().replace(RE_SQUOT, "'\"'\"'") + "'"

  # Note that this is just for convenience, not security. Also, for some
  # incomprehensible reason, some Lenovo devices (e.g. Lenovo A806) behave
  # differently when arguments are given inside single quotes. See
  # https://github.com/openstf/stf/issues/471 for more information. So that's
  # why we now use double quotes here.
  _escapeCompat: (arg) ->
    switch typeof arg
      when 'number'
        arg
      else
        '"' + arg.toString().replace(RE_ESCAPE, '\\$1') + '"'

module.exports = Command
