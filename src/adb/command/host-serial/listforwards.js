// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const Command = require('../../command')
const Protocol = require('../../protocol')

class ListForwardsCommand extends Command {
  execute(serial) {
    this._send(`host-serial:${serial}:list-forward`)
    return this.parser.readAscii(4)
      .then(reply => {
        switch (reply) {
        case Protocol.OKAY:
          return this.parser.readValue()
            .then(value => {
              return this._parseForwards(value)
            })
        case Protocol.FAIL:
          return this.parser.readError()
        default:
          return this.parser.unexpected(reply, 'OKAY or FAIL')
        }
      })
  }

  _parseForwards(value) {
    const forwards = []
    for (let forward of value.toString().split('\n')) {
      if (forward) {
        const [serial, local, remote] = Array.from(forward.split(/\s+/))
        forwards.push({serial, local, remote})
      }
    }
    return forwards
  }
}

module.exports = ListForwardsCommand
