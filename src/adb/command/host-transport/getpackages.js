/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const Command = require('../../command');
const Protocol = require('../../protocol');

var GetPackagesCommand = (function() {
  let RE_PACKAGE = undefined;
  GetPackagesCommand = class GetPackagesCommand extends Command {
    static initClass() {
      RE_PACKAGE = /^package:(.*?)\r?$/gm;
    }

    execute() {
      this._send('shell:pm list packages 2>/dev/null');
      return this.parser.readAscii(4)
        .then(reply => {
          switch (reply) {
            case Protocol.OKAY:
              return this.parser.readAll()
                .then(data => {
                  return this._parsePackages(data.toString());
              });
            case Protocol.FAIL:
              return this.parser.readError();
            default:
              return this.parser.unexpected(reply, 'OKAY or FAIL');
          }
      });
    }

    _parsePackages(value) {
      let match;
      const features = [];
      while ((match = RE_PACKAGE.exec(value))) {
        features.push(match[1]);
      }
      return features;
    }
  };
  GetPackagesCommand.initClass();
  return GetPackagesCommand;
})();

module.exports = GetPackagesCommand;
