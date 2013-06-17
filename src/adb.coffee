Client = require './adb/client'

class Adb
  @createClient: (options) ->
    new Client options

module.exports = Adb
