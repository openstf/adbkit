Command = require '../command'
Protocol = require '../protocol'
LineTransform = require '../linetransform'

class ScreencapCommand extends Command
  execute: (callback) ->
    @parser.readAscii 4, (reply) =>
      switch reply
        when Protocol.OKAY
          callback null, @parser.raw().pipe new LineTransform
        when Protocol.FAIL
          @parser.readError callback
        else
          callback this._unexpected reply
    this._send 'shell:screencap -p'

module.exports = ScreencapCommand
