// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const Command = require('../../command')
const Protocol = require('../../protocol')

class HostVersionCommand extends Command {
  execute() {
    this._send('host:version')
    return this.parser.readAscii(4)
      .then(reply => {
        switch (reply) {
        case Protocol.OKAY:
          return this.parser.readValue()
            .then(value => {
              return this._parseVersion(value)
            })
        case Protocol.FAIL:
          return this.parser.readError()
        default:
          return this._parseVersion(reply)
        }
      })
  }

  _parseVersion(version) {
    return parseInt(version, 16)
  }
}

module.exports = HostVersionCommand
