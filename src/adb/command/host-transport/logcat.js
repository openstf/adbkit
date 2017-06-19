// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const Command = require('../../command')
const Protocol = require('../../protocol')
const LineTransform = require('../../linetransform')

class LogcatCommand extends Command {
  execute(options = {}) {
    // For some reason, LG G Flex requires a filter spec with the -B option.
    // It doesn't actually use it, though. Regardless of the spec we always get
    // all events on all devices.
    let cmd = 'logcat -B *:I 2>/dev/null'
    if (options.clear) { cmd = `logcat -c 2>/dev/null && ${cmd}` }
    this._send(`shell:echo && ${cmd}`)
    return this.parser.readAscii(4)
      .then(reply => {
        switch (reply) {
        case Protocol.OKAY:
          return this.parser.raw().pipe(new LineTransform({autoDetect: true}))
        case Protocol.FAIL:
          return this.parser.readError()
        default:
          return this.parser.unexpected(reply, 'OKAY or FAIL')
        }
      })
  }
}

module.exports = LogcatCommand
