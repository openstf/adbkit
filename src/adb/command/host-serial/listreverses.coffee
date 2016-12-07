Command = require '../../command'
Protocol = require '../../protocol'

class ListReversesCommand extends Command
  execute: (serial) ->
    this._send "host-serial:#{serial}:list-reverse"
    @parser.readAscii 4
      .then (reply) =>
        switch reply
          when Protocol.OKAY
            @parser.readValue()
              .then (value) =>
                this._parseReverses value
          when Protocol.FAIL
            @parser.readError()
          else
            @parser.unexpected reply, 'OKAY or FAIL'

  _parseReverses: (value) ->
    reverses = []
    for reverse in value.toString().split '\n'
      if reverse
        [serial, remote, local] = reverse.split /\s+/
        reverses.push serial: serial, remote: remote, local: local
    return reverses

module.exports = ListReversesCommand
