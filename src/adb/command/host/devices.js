// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const Command = require('../../command')
const Protocol = require('../../protocol')

class HostDevicesCommand extends Command {
  execute() {
    this._send('host:devices')
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
        const [id, type] = Array.from(line.split('\t'))
        devices.push({id, type})
      }
    }
    return devices
  }
}

module.exports = HostDevicesCommand
