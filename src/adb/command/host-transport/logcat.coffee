Command = require '../../command'
Protocol = require '../../protocol'
LineTransform = require '../../linetransform'

class LogcatCommand extends Command
  execute: ->
    this._send 'shell:logcat -B 2>/dev/null'
    @parser.readAscii 4
      .then (reply) =>
        switch reply
          when Protocol.OKAY
            @parser.raw().pipe new LineTransform
          when Protocol.FAIL
            @parser.readError()
          else
            @parser.unexpected reply, 'OKAY or FAIL'

module.exports = LogcatCommand
