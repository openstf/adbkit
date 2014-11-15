Command = require '../../command'
Protocol = require '../../protocol'
LineTransform = require '../../linetransform'

class TcpIpCommand extends Command
  RE_OK = /restarting in/

  execute: (port) ->
    this._send "tcpip:#{port}"
    @parser.readAscii 4
      .then (reply) =>
        switch reply
          when Protocol.OKAY
            @parser.readAll()
              .then (value) ->
                if RE_OK.test(value)
                  port
                else
                  throw new Error value.toString().trim()
          when Protocol.FAIL
            @parser.readError()
          else
            @parser.unexpected reply, 'OKAY or FAIL'

module.exports = TcpIpCommand
