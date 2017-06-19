// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const Command = require('../../command')
const Protocol = require('../../protocol')

class ClearCommand extends Command {
  execute(pkg) {
    this._send(`shell:pm clear ${pkg}`)
    return this.parser.readAscii(4)
      .then(reply => {
        switch (reply) {
        case Protocol.OKAY:
          return this.parser.searchLine(/^(Success|Failed)$/)
            .finally(() => {
              return this.parser.end()
            }).then(function(result) {
              switch (result[0]) {
              case 'Success':
                return true
              case 'Failed':
                    // Unfortunately, the command may stall at this point and we
                    // have to kill the connection.
                throw new Error(`Package '${pkg}' could not be cleared`)
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

module.exports = ClearCommand
