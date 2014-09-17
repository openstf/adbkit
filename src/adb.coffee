Client = require './adb/client'
Keycode = require './adb/keycode'
util = require './adb/util'

class Adb
  @createClient: (options) ->
    new Client options

Adb.Keycode = Keycode

Adb.util = util

module.exports = Adb
