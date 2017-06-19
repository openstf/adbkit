// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const Command = require('../../command')
const Protocol = require('../../protocol')

class HostDevicesWithPathsCommand extends Command {
  execute() {
    this._send('host:devices-l')
    return this.parser.readAscii(4)
      .then(reply => {
        switch (reply) {
        case Protocol.OKAY:
          return this._readDevices()
        case Protocol.FAIL:
          return this.parser.readError()
        default:
          return this.parser.unexpected(reply, 'OKAY or FAIL')
        }
      })
  }

  _readDevices() {
    return this.parser.readValue()
      .then(value => {
        return this._parseDevices(value)
      })
  }

  _parseDevices(value) {
    const devices = []
    if (!value.length) { return devices }
    for (let line of value.toString('ascii').split('\n')) {
      if (line) {
        // For some reason, the columns are separated by spaces instead of tabs
        const [id, type, path] = Array.from(line.split(/\s+/))
        devices.push({id, type, path})
      }
    }
    return devices
  }
}

module.exports = HostDevicesWithPathsCommand
