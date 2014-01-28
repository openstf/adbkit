split = require 'split'
debug = require('debug')('adb:command:waitboot')

Command = require '../../command'
Protocol = require '../../protocol'

class WaitBootCompleteCommand extends Command
  execute: (callback) ->
    @parser.readAscii 4, (reply) =>
      switch reply
        when Protocol.OKAY
          cleanup = ->
            lines.removeListener 'end', endListener
            lines.removeListener 'data', lineListener
          lines = @parser.raw().pipe split()
          lines.on 'end', endListener = ->
            cleanup()
            callback new Error 'Premature end of connection'
          lines.on 'data', lineListener = (line) =>
            switch line.toString()
              when '1'
                cleanup()
                @connection.end()
                callback null
              else
                console.log 'NOT COMPLETE', line
                debug 'Boot is not complete yet'
        when Protocol.FAIL
          @parser.readError callback
        else
          callback this._unexpected reply
    this._send \
      "shell:while getprop sys.boot_completed 2>/dev/null; do sleep 1; done"

module.exports = WaitBootCompleteCommand
