// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const Command = require('../../command')
const Protocol = require('../../protocol')

var TcpIpCommand = (function() {
  let RE_OK = undefined
  TcpIpCommand = class TcpIpCommand extends Command {
    static initClass() {
      RE_OK = /restarting in/
    }

    execute(port) {
      this._send(`tcpip:${port}`)
      return this.parser.readAscii(4)
        .then(reply => {
          switch (reply) {
          case Protocol.OKAY:
            return this.parser.readAll()
              .then(function(value) {
                if (RE_OK.test(value)) {
                  return port
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
  TcpIpCommand.initClass()
  return TcpIpCommand
})()

module.exports = TcpIpCommand
