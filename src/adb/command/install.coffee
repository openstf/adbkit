Command = require '../command'
Protocol = require '../protocol'

class InstallCommand extends Command
  execute: (serial, apk, callback) ->
    # @todo implement SYNC service
    @connection.end()
    @connection._exec ['-s', serial, 'install', apk], {}, (err) ->
      callback err

module.exports = InstallCommand
