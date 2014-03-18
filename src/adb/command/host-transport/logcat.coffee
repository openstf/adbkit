Command = require '../../command'
Protocol = require '../../protocol'
LineTransform = require '../../linetransform'

class LogcatCommand extends Command
  execute: ->
    # For some reason, LG G Flex requires a filter spec with the -B option.
    # It doesn't actually use it, though. Regardless of the spec we always get
    # all events on all devices.
    this._send 'shell:logcat -B * 2>/dev/null'
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
