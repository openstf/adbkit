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
            transform = new LineTransform
            @parser.readBytes 1
              .then (chunk) =>
                transform = new LineTransform
                transform.write chunk
                @parser.raw().pipe transform
              .catch Parser.PrematureEOFError, ->
                throw new Error 'No support for the screencap command'
          when Protocol.FAIL
            @parser.readError()
          else
            @parser.unexpected reply, 'OKAY or FAIL'

module.exports = ScreencapCommand
