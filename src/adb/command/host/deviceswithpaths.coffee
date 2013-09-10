Command = require '../../command'
Protocol = require '../../protocol'

class HostDevicesWithPathsCommand extends Command
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
    this._send 'host:devices-l'

  _parseDevices: (value) ->
    devices = []
    return devices unless value.length
    for line in value.toString('ascii').split '\n'
      if line
        # For some reason, the columns are separated by spaces instead of tabs
        [id, type, path] = line.split /\s+/
        devices.push id: id, type: type, path: path
    return devices

module.exports = HostDevicesWithPathsCommand
