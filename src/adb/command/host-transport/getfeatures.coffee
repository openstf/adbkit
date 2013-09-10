Command = require '../../command'
Protocol = require '../../protocol'
LineTransform = require '../../linetransform'

class GetFeaturesCommand extends Command
  RE_FEATURE = /^feature:(.*?)(?:=(.*?))?$/gm

  execute: (callback) ->
    @parser.readAscii 4, (reply) =>
      switch reply
        when Protocol.OKAY
          data = new Buffer ''
          transform = @parser.raw().pipe new LineTransform
          transform.on 'data', (chunk) ->
            data = Buffer.concat [data, chunk]
          transform.on 'end', =>
            callback null, this._parseFeatures data.toString()
        when Protocol.FAIL
          @parser.readError callback
        else
          callback this._unexpected reply
    this._send 'shell:pm list features'

  _parseFeatures: (value) ->
    features = {}
    while match = RE_FEATURE.exec value
      features[match[1]] = match[2] or true
    return features

module.exports = GetFeaturesCommand
