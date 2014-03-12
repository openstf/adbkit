Command = require '../../command'
Protocol = require '../../protocol'

class ClearCommand extends Command
  execute: (pkg) ->
    this._send "shell:pm clear #{pkg} 2>/dev/null"
    @parser.readAscii 4
      .then (reply) =>
        switch reply
          when Protocol.OKAY
            @parser.readAscii 6
              .then (reply) =>
                switch reply
                  when 'Succes' # 6 bytes for "Failed" (sorry)
                    true
                  when 'Failed'
                    # Unfortunately, the command stalls at this point and we
                    # have to kill the connection.
                    @connection.end()
                    throw new Error "Data of #{pkg} could not be cleared"
                  else
                    @parser.unexpected reply, "'Success' or 'Failed'"
          when Protocol.FAIL
            @parser.readError()
          else
            @parser.unexpected reply, 'OKAY or FAIL'

module.exports = ClearCommand
