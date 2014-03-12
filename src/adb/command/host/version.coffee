Command = require '../../command'
Protocol = require '../../protocol'

class HostVersionCommand extends Command
  execute: ->
    this._send 'host:version'
    @parser.readAscii 4
      .then (reply) =>
        switch reply
          when Protocol.OKAY
            @parser.readValue()
              .then (value) =>
                this._parseVersion value
          when Protocol.FAIL
            @parser.readError()
          else
            this._parseVersion reply

  _parseVersion: (version) ->
    parseInt version, 16

module.exports = HostVersionCommand
