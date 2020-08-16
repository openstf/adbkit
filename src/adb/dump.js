/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const fs = require('fs');

if (process.env.ADBKIT_DUMP) {
  const out = fs.createWriteStream('adbkit.dump');
  module.exports = function(chunk) {
    out.write(chunk);
    return chunk;
  };
} else {
  module.exports = chunk => chunk;
}
