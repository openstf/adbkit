Command = require '../../command'
Protocol = require '../../protocol'

class ShellCommand extends Command
  execute: (command) ->
    if Array.isArray command
      command = command.map(this._escape).join ' '
    this._send "shell:#{command}"
    @parser.readAscii 4
      .then (reply) =>
        switch reply
          when Protocol.OKAY
            @parser.raw()
          when Protocol.FAIL
            @parser.readError()
          else
            @parser.unexpected reply, 'OKAY or FAIL'

module.exports = ShellCommand
