Command = require '../../command'
Protocol = require '../../protocol'

class ShellCommand extends Command
  RE_SQUOT = /'/g

  execute: (command, callback) ->
    if Array.isArray command
      command = command.map(this._escapeArg).join ' '
    @parser.readAscii 4, (reply) =>
      switch reply
        when Protocol.OKAY
          callback null, @parser.raw()
        when Protocol.FAIL
          @parser.readError callback
        else
          callback this._unexpected reply
    this._send "shell:#{command}"

  _escapeArg: (arg) ->
    switch typeof arg
      when 'number'
        arg
      else
        "'" + arg.toString().replace(RE_SQUOT, "'\"'\"'") + "'"

module.exports = ShellCommand
