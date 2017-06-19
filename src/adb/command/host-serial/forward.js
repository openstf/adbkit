// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const Command = require('../../command')
const Protocol = require('../../protocol')

class ForwardCommand extends Command {
  execute(serial, local, remote) {
    this._send(`host-serial:${serial}:forward:${local};${remote}`)
    return this.parser.readAscii(4)
      .then(reply => {
        switch (reply) {
        case Protocol.OKAY:
          return this.parser.readAscii(4)
            .then(reply => {
              switch (reply) {
              case Protocol.OKAY:
                return true
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

module.exports = ForwardCommand
