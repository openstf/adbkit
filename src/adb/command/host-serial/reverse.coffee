Command = require '../../command'
Protocol = require '../../protocol'

class ReverseCommand extends Command
  execute: (serial, remote, local) ->
    this._send "host-serial:#{serial}:reverse:#{remote};#{local}"
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

module.exports = ReverseCommand
