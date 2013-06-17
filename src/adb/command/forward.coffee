Command = require '../command'
Protocol = require '../protocol'

class ForwardCommand extends Command
  execute: (serial, local, remote, callback) ->
    @parser.readAscii 4, (reply) =>
      switch reply
        when Protocol.OKAY
          @parser.readAscii 4, (reply) =>
            switch reply
              when Protocol.OKAY
                callback null
              when Protocol.FAIL
                @parser.readError callback
              else
                callback this._unexpected reply
        when Protocol.FAIL
          @parser.readError callback
        else
          callback this._unexpected reply
    this._send "host-serial:#{serial}:forward:#{local};#{remote}"

module.exports = ForwardCommand
