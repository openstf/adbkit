Command = require '../../command'
Protocol = require '../../protocol'

class RemountCommand extends Command
  execute: ->
    this._send 'remount:'
    @parser.readAscii 4
      .then (reply) =>
        switch reply
          when Protocol.OKAY
            true
          when Protocol.FAIL
            @parser.readError()
          else
            @parser.unexpected reply, 'OKAY or FAIL'

module.exports = RemountCommand
