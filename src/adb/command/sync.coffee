Command = require '../command'
Protocol = require '../protocol'
Sync = require '../sync'

class SyncCommand extends Command
  execute: (callback) ->
    @parser.readAscii 4, (reply) =>
      switch reply
        when Protocol.OKAY
          callback null, new Sync @connection, @parser
        when Protocol.FAIL
          @parser.readError callback
        else
          callback this._unexpected reply
    this._send 'sync:'

module.exports = SyncCommand
