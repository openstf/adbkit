Command = require '../../command'
Protocol = require '../../protocol'

class ClearCommand extends Command
  execute: (pkg, callback) ->
    @parser.readAscii 4, (reply) =>
      switch reply
        when Protocol.OKAY
          @parser.readAscii 6, (reply) =>
            switch reply
              when 'Succes' # 6 bytes for "Failed" (sorry)
                callback null
              when 'Failed'
                # Unfortunately, the command stalls at this point and we have
                # to kill the connection.
                @connection.end()
                callback new Error "Data of #{pkg} could not be cleared"
              else
                callback this._unexpected reply
        when Protocol.FAIL
          @parser.readError callback
        else
          callback this._unexpected reply
    this._send "shell:pm clear #{pkg} 2>/dev/null"

module.exports = ClearCommand
