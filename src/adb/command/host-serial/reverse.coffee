Command = require '../../command'
Protocol = require '../../protocol'

class ReverseCommand extends Command
  execute: (remote, local) ->
    this._send "reverse:forward:#{remote};#{local}"
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
