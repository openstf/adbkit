Command = require '../../command'
Protocol = require '../../protocol'

class UninstallCommand extends Command
  execute: (pkg) ->
    this._send "shell:pm uninstall #{pkg}"
    @parser.readAscii 4
      .then (reply) =>
        switch reply
          when Protocol.OKAY
            @parser.searchLine /^(Success|Failure.*)$/
              .then (match) ->
                if match[1] is 'Success'
                  true
                else
                  # Either way, the package was uninstalled or doesn't exist,
                  # which is good enough for us.
                  true
              .finally =>
                # Consume all remaining content to "naturally" close the
                # connection.
                @parser.readAll()
          when Protocol.FAIL
            @parser.readError()
          else
            @parser.unexpected reply, "OKAY or FAIL"

module.exports = UninstallCommand
