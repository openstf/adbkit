Command = require '../../command'
Protocol = require '../../protocol'

class InstallCommand extends Command
  execute: (apk) ->
    this._send "shell:pm install -r #{this._escapeCompat(apk)}"
    @parser.readAscii 4
      .then (reply) =>
        switch reply
          when Protocol.OKAY
            @parser.searchLine /^(Success|Failure \[(.*?)\])$/
              .then (match) ->
                if match[1] is 'Success'
                  true
                else
                  code = match[2]
                  err = new Error "#{apk} could not be installed [#{code}]"
                  err.code = code
                  throw err
              .finally =>
                # Consume all remaining content to "naturally" close the
                # connection.
                @parser.readAll()
          when Protocol.FAIL
            @parser.readError()
          else
            @parser.unexpected reply, 'OKAY or FAIL'

module.exports = InstallCommand
