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
        typeMap =
          "" : ""
          "novalue" : "n"
          "int": "i"
          "bool": "z"
          "long": "l"
          "uri": "u"
          "string" : "s"
        type = ""
        if extra.type
          if typeMap[extra.type]
            type = typeMap[extra.type]
          else
            callback new Error("Invalid extra type")

        isArray = ""
        if extra.isArray and extra.isArray is true
          isArray = "a"

        if type is "n"  and (typeof extra.value isnt 'undefined' or typeof extra.values isnt 'undefined')
          callback new Error "parameter n should not have value(s)"

        if(isArray isnt "")
          values = extra.values.join(",")
        else
          if(typeof extra.value is 'undefined')
            values = ""
          else
            values = extra.value

        args.push "-e#{type}#{isArray} #{extra.key} #{values}"

    if options.action
      args.push "-a #{options.action}"
    if options.component
      args.push "-n #{options.component}"
    this._send "shell:am start #{args.join ' '}"

module.exports = StartActivityCommand
