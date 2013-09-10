Command = require '../../command'
Protocol = require '../../protocol'

class HostVersionCommand extends Command
  execute: (callback) ->
    @parser.readAscii 4, (reply) =>
      switch reply
        when Protocol.OKAY
          @parser.readValue (value) =>
            callback null, this._parseVersion value
        when Protocol.FAIL
          @parser.readError callback
        else
          callback null, this._parseVersion reply
    this._send 'host:version'

  _parseVersion: (version) ->
    parseInt version, 16

module.exports = HostVersionCommand
