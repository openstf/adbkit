Command = require '../../command'
Protocol = require '../../protocol'

class HostDevicesWithPathsCommand extends Command
  execute: (callback) ->
    this._send 'host:devices-l'
    @parser.readAscii 4
      .then (reply) =>
        switch reply
          when Protocol.OKAY
            @parser.readValue()
              .then (value) =>
                this._parseDevices value
          when Protocol.FAIL
            @parser.readError()
          else
            @parser.unexpected reply, 'OKAY or FAIL'

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
