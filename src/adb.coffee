Client = require './adb/client'
Keycode = require './adb/keycode'
util = require './adb/util'

class Adb
  @createClient: (options = {}) ->
    options.host ||= process.env.ADB_HOST
    options.port ||= process.env.ADB_PORT
    new Client options

Adb.Keycode = Keycode

Adb.util = util

module.exports = Adb
