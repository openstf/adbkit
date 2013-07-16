Command = require '../command'
Protocol = require '../protocol'
LineTransform = require '../linetransform'

class LogcatCommand extends Command
  execute: (options, callback) ->
    filters = ("'#{tag}':#{level.charAt 0}" for {tag, level} in options.filters)
    @parser.readAscii 4, (reply) =>
      switch reply
        when Protocol.OKAY
          callback null, @parser.raw().pipe new LineTransform
        when Protocol.FAIL
          @parser.readError callback
        else
          callback this._unexpected reply
    this._send "shell:logcat -B #{filters.join ' '}"

module.exports = LogcatCommand
