Command = require '../../command'
Protocol = require '../../protocol'

class WaitForDeviceCommand extends Command
  execute: (serial) ->
    this._send "host-serial:#{serial}:wait-for-any-device"
    @parser.readAscii 4
      .then (reply) =>
        switch reply
          when Protocol.OKAY
            @parser.readAscii 4
              .then (reply) =>
                switch reply
                  when Protocol.OKAY
                    serial
                  when Protocol.FAIL
                    @parser.readError()
                  else
                    @parser.unexpected reply, 'OKAY or FAIL'
          when Protocol.FAIL
            @parser.readError()
          else
            @parser.unexpected reply, 'OKAY or FAIL'

module.exports = WaitForDeviceCommand
