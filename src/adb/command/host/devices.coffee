Command = require '../../command'
Protocol = require '../../protocol'

class HostDevicesCommand extends Command
  execute: (callback) ->
    @parser.readAscii 4, (reply) =>
      switch reply
        when Protocol.OKAY
          @parser.readValue (value) =>
            callback null, this._parseDevices value
        when Protocol.FAIL
          @parser.readError callback
        else
          callback this._unexpected reply
    this._send 'host:devices'

  _parseDevices: (value) ->
    devices = []
    return devices unless value.length
    for line in value.toString('ascii').split '\n'
      if line
        [id, type] = line.split '\t'
        devices.push id: id, type: type
    return devices

module.exports = HostDevicesCommand
