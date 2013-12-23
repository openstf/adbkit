Command = require '../../command'
Protocol = require '../../protocol'
LineTransform = require '../../linetransform'

class GetPackagesCommand extends Command
  RE_PACKAGE = /^package:(.*?)$/gm

  execute: (callback) ->
    @parser.readAscii 4, (reply) =>
      switch reply
        when Protocol.OKAY
          data = new Buffer ''
          transform = @parser.raw().pipe new LineTransform
          transform.on 'data', (chunk) ->
            data = Buffer.concat [data, chunk]
          transform.on 'end', =>
            callback null, this._parsePackages data.toString()
        when Protocol.FAIL
          @parser.readError callback
        else
          callback this._unexpected reply
    this._send 'shell:pm list packages 2>/dev/null'

  _parsePackages: (value) ->
    features = []
    while match = RE_PACKAGE.exec value
      features.push match[1]
    return features

module.exports = GetPackagesCommand
