Command = require '../command'
Protocol = require '../protocol'

class IsInstalledCommand extends Command
  execute: (pkg, callback) ->
    @parser.readAscii 4, (reply) =>
      switch reply
        when Protocol.OKAY
          @connection.once 'end', endListener = ->
            callback null, false
          @parser.readAscii 8, (reply) =>
            @connection.removeListener 'end', endListener
            switch reply
              when 'package:'
                callback null, true
              else
                callback this._unexpected reply
        when Protocol.FAIL
          @parser.readError callback
        else
          callback this._unexpected reply
    this._send "shell:pm path #{pkg}"

module.exports = IsInstalledCommand
