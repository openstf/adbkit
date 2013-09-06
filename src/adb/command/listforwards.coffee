Command = require '../command'
Protocol = require '../protocol'

class ListForwardsCommand extends Command
  execute: (serial, callback) ->
    @parser.readAscii 4, (reply) =>
      switch reply
        when Protocol.OKAY
          @parser.readValue (value) =>
            callback null, this._parseForwards value
        when Protocol.FAIL
          @parser.readError callback
        else
          callback this._unexpected reply
    this._send "host-serial:#{serial}:list-forward"

  _parseForwards: (value) ->
    forwards = []
    for forward in value.toString().split '\n'
      if forward
        [serial, local, remote] = forward.split /\s+/
        forwards.push serial: serial, local: local, remote: remote
    return forwards

module.exports = ListForwardsCommand
