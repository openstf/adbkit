// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const Command = require('../../command')
const Protocol = require('../../protocol')

class LocalCommand extends Command {
  execute(path) {
    this._send(/:/.test(path) ? path : `localfilesystem:${path}`)
    return this.parser.readAscii(4)
      .then(reply => {
        switch (reply) {
        case Protocol.OKAY:
          return this.parser.raw()
        case Protocol.FAIL:
          return this.parser.readError()
        default:
          return this.parser.unexpected(reply, 'OKAY or FAIL')
        }
      })
  }
}

module.exports = LocalCommand
