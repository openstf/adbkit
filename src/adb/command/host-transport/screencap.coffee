Promise = require 'bluebird'

Command = require '../../command'
Protocol = require '../../protocol'
Parser = require '../../parser'
LineTransform = require '../../linetransform'

class ScreencapCommand extends Command
  execute: ->
    this._send 'shell:screencap -p 2>/dev/null'
    @parser.readAscii 4
      .then (reply) =>
        switch reply
          when Protocol.OKAY
            resolver = Promise.defer()
            out = @parser.raw().pipe new LineTransform

            out.on 'readable', readableListener = ->
              resolver.resolve out

            out.on 'end', endListener = ->
              resolver.reject new Error 'Unable to run screencap command'

            resolver.promise.finally ->
              out.removeListener 'end', endListener
              out.removeListener 'readable', readableListener
          when Protocol.FAIL
            @parser.readError()
          else
            @parser.unexpected reply, 'OKAY or FAIL'

module.exports = ScreencapCommand
