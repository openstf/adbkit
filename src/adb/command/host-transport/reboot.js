const Command = require('../../command');
const Protocol = require('../../protocol');

class RebootCommand extends Command {
  execute() {
    this._send('reboot:');
    return this.parser.readAscii(4)
      .then(reply => {
        switch (reply) {
          case Protocol.OKAY:
            return this.parser.readAll()
              .return(true);
          case Protocol.FAIL:
            return this.parser.readError();
          default:
            return this.parser.unexpected(reply, 'OKAY or FAIL');
        }
    });
  }
}

module.exports = RebootCommand;
