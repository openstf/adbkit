Command = require '../../command'
Protocol = require '../../protocol'

class LogCommand extends Command
  execute: (name) ->
    this._send "log:#{name}"
    @parser.readAscii 4
      .then (reply) =>
        switch reply
          when Protocol.OKAY
            @parser.raw()
          when Protocol.FAIL
            @parser.readError()
          else
            @parser.unexpected reply, 'OKAY or FAIL'

module.exports = LogCommand
