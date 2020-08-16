/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const Parser = require('./parser');
const Auth = require('./auth');

module.exports.readAll = (stream, callback) => new Parser(stream).readAll(stream)
  .nodeify(callback);

module.exports.parsePublicKey = (keyString, callback) => Auth.parsePublicKey(keyString)
  .nodeify(callback);
