/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const Command = require('../../command');
const Protocol = require('../../protocol');

var DisconnectCommand = (function() {
  let RE_OK = undefined;
  DisconnectCommand = class DisconnectCommand extends Command {
    static initClass() {
      // Possible replies:
      // "No such device 192.168.2.2:5555"
      // ""
      RE_OK = /^$/;
    }

    execute(host, port) {
      this._send(`host:disconnect:${host}:${port}`);
      return this.parser.readAscii(4)
        .then(reply => {
          switch (reply) {
            case Protocol.OKAY:
              return this.parser.readValue()
                .then(function(value) {
                  if (RE_OK.test(value)) {
                    return `${host}:${port}`;
                  } else {
                    throw new Error(value.toString());
                  }
              });
            case Protocol.FAIL:
              return this.parser.readError();
            default:
              return this.parser.unexpected(reply, 'OKAY or FAIL');
          }
      });
    }
  };
  DisconnectCommand.initClass();
  return DisconnectCommand;
})();

module.exports = DisconnectCommand;