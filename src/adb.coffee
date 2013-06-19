Client = require './adb/client'
Keycode = require './adb/keycode'

class Adb
  @createClient: (options) ->
    new Client options

Adb.Keycode = Keycode

module.exports = Adb
