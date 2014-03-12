Command = require '../../command'
Protocol = require '../../protocol'

class GetStateCommand extends Command
  execute: (serial) ->
    this._send "host-serial:#{serial}:get-state"
    @parser.readAscii 4
      .then (reply) =>
        switch reply
          when Protocol.OKAY
            @parser.readValue()
              .then (value) ->
                value.toString()
          when Protocol.FAIL
            @parser.readError()
          else
            @parser.unexpected reply, 'OKAY or FAIL'

module.exports = GetStateCommand
