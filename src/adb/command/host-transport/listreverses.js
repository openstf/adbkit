/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const Command = require('../../command');
const Protocol = require('../../protocol');

class ListReversesCommand extends Command {
  execute() {
    this._send("reverse:list-forward");
    return this.parser.readAscii(4)
      .then(reply => {
        switch (reply) {
          case Protocol.OKAY:
            return this.parser.readValue()
              .then(value => {
                return this._parseReverses(value);
            });
          case Protocol.FAIL:
            return this.parser.readError();
          default:
            return this.parser.unexpected(reply, 'OKAY or FAIL');
        }
    });
  }

  _parseReverses(value) {
    const reverses = [];
    for (let reverse of Array.from(value.toString().split('\n'))) {
      if (reverse) {
        const [serial, remote, local] = Array.from(reverse.split(/\s+/));
        reverses.push({remote, local});
      }
    }
    return reverses;
  }
}

module.exports = ListReversesCommand;
