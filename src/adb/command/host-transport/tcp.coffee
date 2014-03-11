Command = require '../../command'
Protocol = require '../../protocol'

class TcpCommand extends Command
  execute: (port, host) ->
    this._send "tcp:#{port}" + if host then ":#{host}" else ''
    @parser.readAscii 4
      .then (reply) =>
        switch reply
          when Protocol.OKAY
            @parser.raw()
          when Protocol.FAIL
            @parser.readError()
          else
            @parser.unexpected reply, 'OKAY or FAIL'

module.exports = TcpCommand
