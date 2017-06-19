const Parser = require('./parser');
const Auth = require('./auth');

module.exports.readAll = (stream, callback) =>
  new Parser(stream).readAll(stream)
    .nodeify(callback)
;

module.exports.parsePublicKey = (keyString, callback) =>
  Auth.parsePublicKey(keyString)
    .nodeify(callback)
;
