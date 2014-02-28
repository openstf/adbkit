Command = require '../../command'
Protocol = require '../../protocol'

class ShellCommand extends Command
  execute: (command, callback) ->
    if Array.isArray command
      command = command.map(this._escape).join ' '
    @parser.readAscii 4, (reply) =>
      switch reply
        when Protocol.OKAY
          callback null, @parser.raw()
        when Protocol.FAIL
          @parser.readError callback
        else
          callback this._unexpected reply
    this._send "shell:#{command}"

module.exports = ShellCommand
