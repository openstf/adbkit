Path = require 'path'

module.exports = switch Path.extname __filename
  when '.coffee' then require './src/adb'
  else require './lib/adb'
