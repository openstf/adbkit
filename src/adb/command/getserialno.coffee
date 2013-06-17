Command = require '../command'
Protocol = require '../protocol'

class GetSerialNoCommand extends Command
  execute: (serial, callback) ->
    @parser.readAscii 4, (reply) =>
      switch reply
        when Protocol.OKAY
          @parser.readValue (value) =>
            callback null, value.toString 'ascii'
        when Protocol.FAIL
          @parser.readError callback
        else
          callback this._unexpected reply
    this._send "host-serial:#{serial}:get-serialno"

module.exports = GetSerialNoCommand
