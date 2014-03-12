Command = require '../../command'
Protocol = require '../../protocol'

class HostTransportCommand extends Command
  execute: (serial) ->
    this._send "host:transport:#{serial}"
    @parser.readAscii 4
      .then (reply) =>
        switch reply
          when Protocol.OKAY
            true
          when Protocol.FAIL
            @parser.readError()
          else
            @parser.unexpected reply, 'OKAY or FAIL'

module.exports = HostTransportCommand
