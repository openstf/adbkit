Command = require '../command'
Protocol = require '../protocol'

class TcpCommand extends Command
  execute: (port, host, callback) ->
    @parser.readAscii 4, (reply) =>
      switch reply
        when Protocol.OKAY
          callback null, @parser.raw()
        when Protocol.FAIL
          @parser.readError callback
        else
          callback this._unexpected reply
    this._send "tcp:#{port}" + if host then ":#{host}" else ''

module.exports = TcpCommand
