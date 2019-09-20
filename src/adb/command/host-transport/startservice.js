/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const Command = require('../../command');
const Protocol = require('../../protocol');
const Parser = require('../../parser');

const StartActivityCommand = require('./startactivity');

class StartServiceCommand extends StartActivityCommand {
  execute(options) {
    const args = this._intentArgs(options);
    if (options.user || (options.user === 0)) {
      args.push('--user', this._escape(options.user));
    }
    return this._run('startservice', args);
  }
}

module.exports = StartServiceCommand;
