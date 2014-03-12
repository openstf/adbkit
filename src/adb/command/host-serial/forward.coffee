Command = require '../../command'
Protocol = require '../../protocol'

class ForwardCommand extends Command
  execute: (serial, local, remote) ->
    this._send "host-serial:#{serial}:forward:#{local};#{remote}"
    @parser.readAscii 4
      .then (reply) =>
        switch reply
          when Protocol.OKAY
            @parser.readAscii 4
              .then (reply) =>
                switch reply
                  when Protocol.OKAY
                    true
                  when Protocol.FAIL
                    @parser.readError()
                  else
                    @parser.unexpected reply, 'OKAY or FAIL'
          when Protocol.FAIL
            @parser.readError()
          else
            @parser.unexpected reply, 'OKAY or FAIL'

module.exports = ForwardCommand
