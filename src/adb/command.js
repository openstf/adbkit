/* eslint-disable
    no-undef,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
const debug = require('debug')('adb:command')

const Parser = require('./parser')
const Protocol = require('./protocol')

var Command = (function() {
  let RE_SQUOT = undefined
  let RE_ESCAPE = undefined
  Command = class Command {
    static initClass() {
      RE_SQUOT = /'/g
      RE_ESCAPE = /([$`\\!"])/g
    }

    constructor(connection) {
      this.connection = connection
      this.parser = this.connection.parser
      this.protocol = Protocol
    }

    execute() {
      throw new Exception('Missing implementation')
    }

    _send(data) {
      const encoded = Protocol.encodeData(data)
      debug(`Send '${encoded}'`)
      this.connection.write(encoded)
      return this
    }

    // Note that this is just for convenience, not security.
    _escape(arg) {
      switch (typeof arg) {
      case 'number':
        return arg
      default:
        return `'${arg.toString().replace(RE_SQUOT, '\'"\'"\'')}'`
      }
    }

    // Note that this is just for convenience, not security. Also, for some
    // incomprehensible reason, some Lenovo devices (e.g. Lenovo A806) behave
    // differently when arguments are given inside single quotes. See
    // https://github.com/openstf/stf/issues/471 for more information. So that's
    // why we now use double quotes here.
    _escapeCompat(arg) {
      switch (typeof arg) {
      case 'number':
        return arg
      default:
        return `"${arg.toString().replace(RE_ESCAPE, '\\$1')}"`
      }
    }
  }
  Command.initClass()
  return Command
})()

module.exports = Command
