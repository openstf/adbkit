// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const Command = require('../../command')
const Protocol = require('../../protocol')

class InstallCommand extends Command {
  execute(apk) {
    this._send(`shell:pm install -r ${this._escapeCompat(apk)}`)
    return this.parser.readAscii(4)
      .then(reply => {
        switch (reply) {
        case Protocol.OKAY:
          return this.parser.searchLine(/^(Success|Failure \[(.*?)\])$/)
            .then(function(match) {
              if (match[1] === 'Success') {
                return true
              } else {
                const code = match[2]
                const err = new Error(`${apk} could not be installed [${code}]`)
                err.code = code
                throw err
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

module.exports = InstallCommand
