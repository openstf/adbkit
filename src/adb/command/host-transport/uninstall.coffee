Command = require '../../command'
Protocol = require '../../protocol'

class UninstallCommand extends Command
  execute: (pkg, callback) ->
    @parser.readAscii 4, (reply) =>
      switch reply
        when Protocol.OKAY
          @parser.readAscii 7, (reply) =>
            switch reply
              # Either way, the package was uninstalled
              when 'Success', 'Failure'
                callback null
              else
                callback this._unexpected reply
        when Protocol.FAIL
          @parser.readError callback
        else
          callback this._unexpected reply
    this._send "shell:pm uninstall #{pkg} 2>/dev/null"

module.exports = UninstallCommand
