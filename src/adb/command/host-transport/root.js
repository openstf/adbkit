// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const Command = require('../../command')
const Protocol = require('../../protocol')

var RootCommand = (function() {
  let RE_OK = undefined
  RootCommand = class RootCommand extends Command {
    static initClass() {
      RE_OK = /restarting adbd as root/
    }

    execute() {
      this._send('root:')
      return this.parser.readAscii(4)
        .then(reply => {
          switch (reply) {
          case Protocol.OKAY:
            return this.parser.readAll()
              .then(function(value) {
                if (RE_OK.test(value)) {
                  return true
                } else {
                  throw new Error(value.toString().trim())
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
  RootCommand.initClass()
  return RootCommand
})()

module.exports = RootCommand
