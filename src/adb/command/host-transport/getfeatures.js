Command = require '../../command'
Protocol = require '../../protocol'

class GetFeaturesCommand extends Command
  RE_FEATURE = /^feature:(.*?)(?:=(.*?))?\r?$/gm

  execute: ->
    this._send 'shell:pm list features 2>/dev/null'
    @parser.readAscii 4
      .then (reply) =>
        switch reply
          when Protocol.OKAY
            @parser.readAll()
              .then (data) =>
                this._parseFeatures data.toString()
          when Protocol.FAIL
            @parser.readError()
          else
            @parser.unexpected reply, 'OKAY or FAIL'

  _parseFeatures: (value) ->
    features = {}
    while match = RE_FEATURE.exec value
      features[match[1]] = match[2] or true
    return features

module.exports = GetFeaturesCommand
