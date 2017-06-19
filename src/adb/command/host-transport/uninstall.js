// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const Command = require('../../command')
const Protocol = require('../../protocol')

class UninstallCommand extends Command {
  execute(pkg) {
    this._send(`shell:pm uninstall ${pkg}`)
    return this.parser.readAscii(4)
      .then(reply => {
        switch (reply) {
        case Protocol.OKAY:
          return this.parser.searchLine(/^(Success|Failure.*|.*Unknown package:.*)$/)
            .then(function(match) {
              if (match[1] === 'Success') {
                return true
              } else {
                // Either way, the package was uninstalled or doesn't exist,
                // which is good enough for us.
                return true
              }}).finally(() => {
              // Consume all remaining content to "naturally" close the
              // connection.
              return this.parser.readAll()
            })
        case Protocol.FAIL:
          return this.parser.readError()
        default:
          return this.parser.unexpected(reply, 'OKAY or FAIL')
        }
      })
  }
}

module.exports = UninstallCommand
