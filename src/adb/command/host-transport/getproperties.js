Command = require '../../command'
Protocol = require '../../protocol'

class GetPropertiesCommand extends Command
  RE_KEYVAL = /^\[([\s\S]*?)\]: \[([\s\S]*?)\]\r?$/gm

  execute: ->
    this._send 'shell:getprop'
    @parser.readAscii 4
      .then (reply) =>
        switch reply
          when Protocol.OKAY
            @parser.readAll()
              .then (data) =>
                this._parseProperties data.toString()
          when Protocol.FAIL
            @parser.readError()
          else
            @parser.unexpected reply, 'OKAY or FAIL'

  _parseProperties: (value) ->
    properties = {}
    while match = RE_KEYVAL.exec value
      properties[match[1]] = match[2]
    return properties

module.exports = GetPropertiesCommand
