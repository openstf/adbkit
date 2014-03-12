Command = require '../../command'
Protocol = require '../../protocol'

class UninstallCommand extends Command
  execute: (pkg) ->
    this._send "shell:pm uninstall #{pkg} 2>/dev/null"
    @parser.readAscii 4
      .then (reply) =>
        switch reply
          when Protocol.OKAY
            @parser.readAscii 7
              .then (reply) =>
                switch reply
                  # Either way, the package was uninstalled
                  when 'Success', 'Failure'
                    true
                  else
                    @parser.unexpected reply, "'Success' or 'Failure'"
          when Protocol.FAIL
            @parser.readError()
          else
            @parser.unexpected reply, "OKAY or FAIL"

module.exports = UninstallCommand
