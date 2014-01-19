Command = require '../../command'
Protocol = require '../../protocol'
LineTransform = require '../../linetransform'

class ScreencapCommand extends Command
  execute: (callback) ->
    @parser.readAscii 4, (reply) =>
      switch reply
        when Protocol.OKAY
          out = @parser.raw().pipe new LineTransform
          out.once 'end', closeListener = ->
            out.removeListener 'readable', readableListener
            callback new Error 'Unable to run screencap command'
          out.once 'readable', readableListener = ->
            out.removeListener 'end', closeListener
            callback null, out
        when Protocol.FAIL
          @parser.readError callback
        else
          callback this._unexpected reply
    this._send 'shell:screencap -p 2>/dev/null'

module.exports = ScreencapCommand
