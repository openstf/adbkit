Command = require '../../command'
Protocol = require '../../protocol'

class RootCommand extends Command
  execute: ->
    this._send 'root:'
    @parser.readAscii 4
      .then (reply) =>
        switch reply
          when Protocol.OKAY
            true
          when Protocol.FAIL
            @parser.readError()
          else
            @parser.unexpected reply, 'OKAY or FAIL'

module.exports = RootCommand
