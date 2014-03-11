Command = require '../../command'
Protocol = require '../../protocol'

class InstallCommand extends Command
  execute: (apk) ->
    this._send "shell:pm install -r '#{apk}' 2>/dev/null"
    @parser.readAscii 4
      .then (reply) =>
        switch reply
          when Protocol.OKAY
            @parser.readAscii 7
              .then (reply) =>
                switch reply
                  when 'Success'
                    @connection.end()
                    true
                  when 'Failure'
                    throw new Error "#{apk} could not be installed"
                  else
                    @parser.unexpected reply, "'Success' or 'Failure'"
          when Protocol.FAIL
            @parser.readError()
          else
            @parser.unexpected reply, 'OKAY or FAIL'

module.exports = InstallCommand
