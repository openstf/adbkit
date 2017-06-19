Command = require '../../command'
Protocol = require '../../protocol'

class GetSerialNoCommand extends Command
  execute: (serial) ->
    this._send "host-serial:#{serial}:get-serialno"
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

module.exports = GetSerialNoCommand
