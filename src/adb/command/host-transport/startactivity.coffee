Command = require '../../command'
Protocol = require '../../protocol'
Parser = require '../../parser'

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

  execute: (options) ->
    args = this._intentArgs options
    if options.debug
      args.push '-D'
    if options.wait
      args.push '-W'
    if options.user or options.user is 0
      args.push '--user', this._escape options.user
    this._run 'start', args

  _run: (command, args) ->
    this._send "shell:am #{command} #{args.join ' '}"
    @parser.readAscii 4
      .then (reply) =>
        switch reply
          when Protocol.OKAY
            @parser.searchLine RE_ERROR
              .finally =>
                @connection.end()
              .then (match) ->
                throw new Error match[1]
              .catch Parser.PrematureEOFError, (err) ->
                true
          when Protocol.FAIL
            @parser.readError()
          else
            @parser.unexpected reply, 'OKAY or FAIL'

  _intentArgs: (options) ->
    args = []
    if options.extras
      args.push.apply args, this._formatExtras options.extras
    if options.action
      args.push '-a', this._escape options.action
    if options.data
      args.push '-d', this._escape options.data
    if options.mimeType
      args.push '-t', this._escape options.mimeType
    if options.category
      if Array.isArray options.category
        options.category.forEach (category) =>
          args.push '-c', this._escape category
      else
        args.push '-c', this._escape options.category
    if options.component
      args.push '-n', this._escape options.component
    if options.flags
      args.push '-f', this._escape options.flags
    return args

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
      args.push "--e#{type}"
      args.push this._escape extra.key
    else if Array.isArray extra.value
      args.push "--e#{type}a"
      args.push this._escape extra.key
      args.push this._escape extra.value.join ','
    else
      args.push "--e#{type}"
      args.push this._escape extra.key
      args.push this._escape extra.value
    return args

module.exports = StartActivityCommand
