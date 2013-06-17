Command = require '../command'
Protocol = require '../protocol'

class LogCommand extends Command
  execute: (name, callback) ->
    @parser.readAscii 4, (reply) =>
      switch reply
        when Protocol.OKAY
          callback null, @parser.raw()
        when Protocol.FAIL
          @parser.readError callback
        else
          callback this._unexpected reply
    this._send "log:#{name}"

module.exports = LogCommand
