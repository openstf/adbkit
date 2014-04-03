Command = require '../../command'
Protocol = require '../../protocol'
Sync = require '../../sync'

class SyncCommand extends Command
  execute: ->
    this._send 'sync:'
    @parser.readAscii 4
      .then (reply) =>
        switch reply
          when Protocol.OKAY
            new Sync @connection
          when Protocol.FAIL
            @parser.readError()
          else
            @parser.unexpected reply, 'OKAY or FAIL'

module.exports = SyncCommand
