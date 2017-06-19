// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const Command = require('../../command')
const Protocol = require('../../protocol')

class WaitForDeviceCommand extends Command {
  execute(serial) {
    this._send(`host-serial:${serial}:wait-for-any`)
    return this.parser.readAscii(4)
      .then(reply => {
        switch (reply) {
        case Protocol.OKAY:
          return this.parser.readAscii(4)
            .then(reply => {
              switch (reply) {
              case Protocol.OKAY:
                return serial
              case Protocol.FAIL:
                return this.parser.readError()
              default:
                return this.parser.unexpected(reply, 'OKAY or FAIL')
              }
            })
        case Protocol.FAIL:
          return this.parser.readError()
        default:
          return this.parser.unexpected(reply, 'OKAY or FAIL')
        }
      })
  }
}

module.exports = WaitForDeviceCommand
