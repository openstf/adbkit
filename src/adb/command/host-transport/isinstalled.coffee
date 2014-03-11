Command = require '../../command'
Protocol = require '../../protocol'
Parser = require '../../parser'

class IsInstalledCommand extends Command
  execute: (pkg) ->
    this._send "shell:pm path #{pkg} 2>/dev/null"
    @parser.readAscii 4
      .then (reply) =>
        switch reply
          when Protocol.OKAY
            @parser.readAscii 8
              .then (reply) =>
                switch reply
                  when 'package:'
                    true
                  else
                    @parser.unexpected reply, "'package:'"
              .catch Parser.PrematureEOFError, (err) ->
                false
          when Protocol.FAIL
            @parser.readError()
          else
            @parser.unexpected reply, 'OKAY or FAIL'

module.exports = IsInstalledCommand
