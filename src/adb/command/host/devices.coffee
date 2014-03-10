Command = require '../../command'
Protocol = require '../../protocol'

class HostDevicesCommand extends Command
  execute: (callback) ->
    this._send 'host:devices'
    @parser.readAscii 4
      .then (reply) =>
        switch reply
          when Protocol.OKAY
            this._readDevices()
          when Protocol.FAIL
            @parser.readError()
          else
            @parser.unexpected reply, 'OKAY or FAIL'

  _readDevices: ->
    @parser.readValue()
      .then (value) =>
        this._parseDevices value

  _parseDevices: (value) ->
    devices = []
    return devices unless value.length
    for line in value.toString('ascii').split '\n'
      if line
        [id, type] = line.split '\t'
        devices.push id: id, type: type
    return devices

module.exports = HostDevicesCommand
