Command = require '../../command'
Protocol = require '../../protocol'

class ConnectCommand extends Command
  # Possible replies:
  # "unable to connect to 192.168.2.2:5555"
  # "connected to 192.168.2.2:5555"
  # "already connected to 192.168.2.2:5555"
  RE_OK = /connected to|already connected/

  execute: (host, port) ->
    this._send "host:connect:#{host}:#{port}"
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

module.exports = ConnectCommand
