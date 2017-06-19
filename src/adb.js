const Client = require('./adb/client');
const Keycode = require('./adb/keycode');
const util = require('./adb/util');

class Adb {
  static createClient(options = {}) {
    if (!options.host) { options.host = process.env.ADB_HOST; }
    if (!options.port) { options.port = process.env.ADB_PORT; }
    return new Client(options);
  }
}

Adb.Keycode = Keycode;

Adb.util = util;

module.exports = Adb;
