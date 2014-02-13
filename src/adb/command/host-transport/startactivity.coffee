split = require 'split'

Command = require '../../command'
Protocol = require '../../protocol'

class StartActivityCommand extends Command
  RE_ERROR = /^Error: (.*)$/

  execute: (options, callback) ->
    @parser.readAscii 4, (reply) =>
      switch reply
        when Protocol.OKAY
          err = null
          lines = @parser.raw().pipe split()
          lines.on 'data', (line) ->
            if match = RE_ERROR.exec line
              err = new Error match[1]
          lines.on 'end', ->
            callback err
        when Protocol.FAIL
          @parser.readError callback
        else
          callback this._unexpected reply
    args = []
	if options.extras
		options.extras.forEach (extra) ->
			args.push "-e #{extra.key} #{extra.value}"
    if options.action
      args.push "-a #{options.action}"
    if options.component
      args.push "-n #{options.component}"
    this._send "shell:am start #{args.join ' '}"

module.exports = StartActivityCommand
