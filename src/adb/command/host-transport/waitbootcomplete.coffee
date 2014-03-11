debug = require('debug')('adb:command:waitboot')

Command = require '../../command'
Protocol = require '../../protocol'

class WaitBootCompleteCommand extends Command
  execute: ->
    this._send \
      'shell:while getprop sys.boot_completed 2>/dev/null; do sleep 1; done'
    @parser.readAscii 4
      .then (reply) =>
        switch reply
          when Protocol.OKAY
            @parser.searchLine /^1$/
              .finally =>
                @connection.end()
              .then ->
                true
          when Protocol.FAIL
            @parser.readError()
          else
            @parser.unexpected reply, 'OKAY or FAIL'

module.exports = WaitBootCompleteCommand
