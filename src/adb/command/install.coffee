Command = require '../command'
Protocol = require '../protocol'

class InstallCommand extends Command
  execute: (apk, callback) ->
    # @todo implement SYNC service
    @connection.end()
    @connection._exec ['install', apk], {}, (err) ->
      callback err

module.exports = InstallCommand
