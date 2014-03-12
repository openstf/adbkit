Command = require '../../command'
Protocol = require '../../protocol'

class ListForwardsCommand extends Command
  execute: (serial) ->
    this._send "host-serial:#{serial}:list-forward"
    @parser.readAscii 4
      .then (reply) =>
        switch reply
          when Protocol.OKAY
            @parser.readValue()
              .then (value) =>
                this._parseForwards value
          when Protocol.FAIL
            @parser.readError()
          else
            @parser.unexpected reply, 'OKAY or FAIL'

  _parseForwards: (value) ->
    forwards = []
    for forward in value.toString().split '\n'
      if forward
        [serial, local, remote] = forward.split /\s+/
        forwards.push serial: serial, local: local, remote: remote
    return forwards

module.exports = ListForwardsCommand
