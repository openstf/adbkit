Command = require '../../command'
Protocol = require '../../protocol'

class DisconnectCommand extends Command
  # Possible replies:
  # "No such device 192.168.2.2:5555"
  # ""
  # disconnected host:port
  RE_OK = /^disconnected (?:[0-9]{1,3}\.){3}[0-9]{1,3}\:?([0-9]{1,5})|(^$)/

  execute: (host, port) ->
    this._send "host:disconnect:#{host}:#{port}"
    @parser.readAscii 4
      .then (reply) =>
        switch reply
          when Protocol.OKAY
            @parser.readValue()
              .then (value) ->
                if RE_OK.test value
                  "#{host}:#{port}"
                else
                  throw new Error value.toString()
          when Protocol.FAIL
            @parser.readError()
          else
            @parser.unexpected reply, 'OKAY or FAIL'

module.exports = DisconnectCommand
