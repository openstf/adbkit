// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const Command = require('../../command')
const Protocol = require('../../protocol')

var ConnectCommand = (function() {
  let RE_OK = undefined
  ConnectCommand = class ConnectCommand extends Command {
    static initClass() {
      // Possible replies:
      // "unable to connect to 192.168.2.2:5555"
      // "connected to 192.168.2.2:5555"
      // "already connected to 192.168.2.2:5555"
      RE_OK = /connected to|already connected/
    }

    execute(host, port) {
      this._send(`host:connect:${host}:${port}`)
      return this.parser.readAscii(4)
        .then(reply => {
          switch (reply) {
          case Protocol.OKAY:
            return this.parser.readValue()
              .then(function(value) {
                if (RE_OK.test(value)) {
                  return `${host}:${port}`
                } else {
                  throw new Error(value.toString())
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
  ConnectCommand.initClass()
  return ConnectCommand
})()

module.exports = ConnectCommand
