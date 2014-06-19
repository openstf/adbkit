Command = require '../../command'
Protocol = require '../../protocol'

class RebootCommand extends Command
  execute: ->
    this._send 'reboot:'
    @parser.readAscii 4
      .then (reply) =>
        switch reply
          when Protocol.OKAY
            @parser.readAll()
              .return true
          when Protocol.FAIL
            @parser.readError()
          else
            @parser.unexpected reply, 'OKAY or FAIL'

module.exports = RebootCommand
