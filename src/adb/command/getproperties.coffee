Command = require '../command'
Protocol = require '../protocol'
LineTransform = require '../linetransform'

class GetPropertiesCommand extends Command
  RE_KEYVAL = /^\[([\s\S]*?)\]: \[([\s\S]*?)\]$/gm

  execute: (callback) ->
    @parser.readAscii 4, (reply) =>
      switch reply
        when Protocol.OKAY
          data = new Buffer ''
          transform = @parser.raw().pipe new LineTransform
          transform.on 'data', (chunk) ->
            data = Buffer.concat [data, chunk]
          transform.on 'end', =>
            callback null, this._parseProperties data.toString()
        when Protocol.FAIL
          @parser.readError callback
        else
          callback this._unexpected reply
    this._send 'shell:getprop'

  _parseProperties: (value) ->
    properties = {}
    while match = RE_KEYVAL.exec value
      properties[match[1]] = match[2]
    return properties

module.exports = GetPropertiesCommand
