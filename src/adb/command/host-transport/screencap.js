/* eslint-disable
    no-case-declarations,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
const Promise = require('bluebird')

const Command = require('../../command')
const Protocol = require('../../protocol')
const Parser = require('../../parser')
const LineTransform = require('../../linetransform')

class ScreencapCommand extends Command {
  execute() {
    this._send('shell:echo && screencap -p 2>/dev/null')
    return this.parser.readAscii(4)
      .then(reply => {
        switch (reply) {
        case Protocol.OKAY:
          let transform = new LineTransform
          return this.parser.readBytes(1)
            .then(chunk => {
              transform = new LineTransform({autoDetect: true})
              transform.write(chunk)
              return this.parser.raw().pipe(transform)
            }).catch(Parser.PrematureEOFError, function() {
              throw new Error('No support for the screencap command')
            })
        case Protocol.FAIL:
          return this.parser.readError()
        default:
          return this.parser.unexpected(reply, 'OKAY or FAIL')
        }
      })
  }
}

module.exports = ScreencapCommand
