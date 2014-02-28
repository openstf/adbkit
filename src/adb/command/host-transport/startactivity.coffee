split = require 'split'

Command = require '../../command'
Protocol = require '../../protocol'

class StartActivityCommand extends Command
  RE_ERROR = /^Error: (.*)$/
  EXTRA_TYPES =
    string: 's'
    null: 'sn'
    bool: 'z'
    int: 'i'
    long: 'l'
    float: 'l'
    uri: 'u'
    component: 'cn'

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
      args.push.apply args, this._formatExtras options.extras
    if options.action
      args.push '-a', this._escape options.action
    if options.component
      args.push '-n', this._escape options.component
    this._send "shell:am start #{args.join ' '}"

  _formatExtras: (extras) ->
    return [] unless extras
    if Array.isArray extras
      extras.reduce (all, extra) =>
        all.concat this._formatLongExtra extra
      , []
    else
      Object.keys(extras).reduce (all, key) =>
        all.concat this._formatShortExtra key, extras[key]
      , []

  _formatShortExtra: (key, value) ->
    sugared =
      key: key
    if value is null
      sugared.type = 'null'
    else if Array.isArray value
      throw new Error "Refusing to format array value '#{key}' using short
        syntax; empty array would cause unpredictable results due to unknown
        type. Please use long syntax instead."
    else
      switch typeof value
        when 'string'
          sugared.type = 'string'
          sugared.value = value
        when 'boolean'
          sugared.type = 'bool'
          sugared.value = value
        when 'number'
          sugared.type = 'int'
          sugared.value = value
        when 'object'
          sugared = value
          sugared.key = key
    return this._formatLongExtra sugared

  _formatLongExtra: (extra) ->
    args = []
    extra.type = 'string' unless extra.type
    type = EXTRA_TYPES[extra.type]
    unless type
      throw new Error "Unsupported type '#{extra.type}' for extra
        '#{extra.key}'"
    if extra.type is 'null'
      args.push "-e#{type}"
      args.push this._escape extra.key
    else if Array.isArray extra.value
      args.push "-e#{type}a"
      args.push this._escape extra.key
      args.push this._escape extra.value.join ','
    else
      args.push "-e#{type}"
      args.push this._escape extra.key
      args.push this._escape extra.value
    return args

module.exports = StartActivityCommand
