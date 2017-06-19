/* eslint-disable
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
const Command = require('../../command')
const Protocol = require('../../protocol')
const Parser = require('../../parser')

class IsInstalledCommand extends Command {
  execute(pkg) {
    this._send(`shell:pm path ${pkg} 2>/dev/null`)
    return this.parser.readAscii(4)
      .then(reply => {
        switch (reply) {
        case Protocol.OKAY:
          return this.parser.readAscii(8)
            .then(reply => {
              switch (reply) {
              case 'package:':
                return true
              default:
                return this.parser.unexpected(reply, '\'package:\'')
              }
            }).catch(Parser.PrematureEOFError, err => false)
        case Protocol.FAIL:
          return this.parser.readError()
        default:
          return this.parser.unexpected(reply, 'OKAY or FAIL')
        }
      })
  }
}

module.exports = IsInstalledCommand
