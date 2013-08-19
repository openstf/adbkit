Command = require '../command'
Protocol = require '../protocol'

class InstallCommand extends Command
  execute: (apk, callback) ->
    @parser.readAscii 4, (reply) =>
      switch reply
        when Protocol.OKAY
          @parser.skipLine =>
            @parser.readAscii 7, (reply) =>
              switch reply
                when 'Success'
                  @parser.skipLine ->
                    callback null
                when 'Failure'
                  callback new Error "#{apk} could not be installed"
                else
                  callback this._unexpected reply
        when Protocol.FAIL
          @parser.readError callback
        else
          callback this._unexpected reply
    this._send "shell:pm install -r #{apk}"

module.exports = InstallCommand
