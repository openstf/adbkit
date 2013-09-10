Command = require '../../command'
Protocol = require '../../protocol'

class RemountCommand extends Command
  execute: (callback) ->
    @parser.readAscii 4, (reply) =>
      switch reply
        when Protocol.OKAY
          callback null
        when Protocol.FAIL
          @parser.readError callback
        else
          callback this._unexpected reply
    this._send 'remount:'

module.exports = RemountCommand
