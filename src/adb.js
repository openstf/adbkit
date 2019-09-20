/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const Client = require('./adb/client');
const Keycode = require('./adb/keycode');
const util = require('./adb/util');

class Adb {
  static createClient(options) {
    if (options == null) { options = {}; }
    if (!options.host) { options.host = process.env.ADB_HOST; }
    if (!options.port) { options.port = process.env.ADB_PORT; }
    return new Client(options);
  }
}

Adb.Keycode = Keycode;

Adb.util = util;

module.exports = Adb;
