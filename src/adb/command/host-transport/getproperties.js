// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const Command = require('../../command')
const Protocol = require('../../protocol')

var GetPropertiesCommand = (function() {
  let RE_KEYVAL = undefined
  GetPropertiesCommand = class GetPropertiesCommand extends Command {
    static initClass() {
      RE_KEYVAL = /^\[([\s\S]*?)\]: \[([\s\S]*?)\]\r?$/gm
    }

    execute() {
      this._send('shell:getprop')
      return this.parser.readAscii(4)
        .then(reply => {
          switch (reply) {
          case Protocol.OKAY:
            return this.parser.readAll()
              .then(data => {
                return this._parseProperties(data.toString())
              })
          case Protocol.FAIL:
            return this.parser.readError()
          default:
            return this.parser.unexpected(reply, 'OKAY or FAIL')
          }
        })
    }

    _parseProperties(value) {
      let match
      const properties = {}
      while ((match = RE_KEYVAL.exec(value))) {
        properties[match[1]] = match[2]
      }
      return properties
    }
  }
  GetPropertiesCommand.initClass()
  return GetPropertiesCommand
})()

module.exports = GetPropertiesCommand
