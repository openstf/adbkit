Connection = require './connection'
HostVersionCommand = require './command/hostversion'

class Client
  constructor: (@options = {}) ->
    @options.port ||= 5037
    @options.bin ||= 'adb'

  connection: (callback) ->
    new Connection(@options)
      .connect()

  version: (callback) ->
    this.connection()
      .on 'connect', ->
        new HostVersionCommand(this)
          .execute callback
      .on 'error', callback
    return this

module.exports = Client
