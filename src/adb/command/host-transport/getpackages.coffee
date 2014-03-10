Command = require '../../command'
Protocol = require '../../protocol'

class GetPackagesCommand extends Command
  RE_PACKAGE = /^package:(.*?)\r?$/gm

  execute: ->
    this._send 'shell:pm list packages 2>/dev/null'
    @parser.readAscii 4
      .then (reply) =>
        switch reply
          when Protocol.OKAY
            @parser.readAll()
              .then (data) =>
                this._parsePackages data.toString()
          when Protocol.FAIL
            @parser.readError()
          else
            @parser.unexpected reply, 'OKAY or FAIL'

  _parsePackages: (value) ->
    features = []
    while match = RE_PACKAGE.exec value
      features.push match[1]
    return features

module.exports = GetPackagesCommand
