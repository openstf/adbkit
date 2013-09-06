Command = require '../../command'
Protocol = require '../../protocol'

class MonkeyCommand extends Command
  execute: (port, callback) ->
    @parser.readAscii 4, (reply) =>
      switch reply
        when Protocol.OKAY
          @parser.readAscii 8, (output) =>
            if output is ':Monkey:'
              callback null
            else
              callback this._unexpected reply
            @connection.end()
        when Protocol.FAIL
          @parser.readError callback
        else
          callback this._unexpected reply
    this._send "shell:monkey --port #{port} -v"

module.exports = MonkeyCommand
