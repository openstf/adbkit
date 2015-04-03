Command = require '../../command'
Protocol = require '../../protocol'

class ClearCommand extends Command
  execute: (pkg) ->
    this._send "shell:pm clear #{pkg}"
    @parser.readAscii 4
      .then (reply) =>
        switch reply
          when Protocol.OKAY
            @parser.searchLine /^(Success|Failed)$/
              .finally =>
                @parser.end()
              .then (result) ->
                switch result[0]
                  when 'Success'
                    true
                  when 'Failed'
                    # Unfortunately, the command may stall at this point and we
                    # have to kill the connection.
                    throw new Error "Package '#{pkg}' could not be cleared"
          when Protocol.FAIL
            @parser.readError()
          else
            @parser.unexpected reply, 'OKAY or FAIL'

module.exports = ClearCommand
