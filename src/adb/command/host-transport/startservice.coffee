Command = require '../../command'
Protocol = require '../../protocol'
Parser = require '../../parser'

StartActivityCommand = require './startactivity'

class StartServiceCommand extends StartActivityCommand
  execute: (options) ->
    args = this._intentArgs options
    if options.user or options.user is 0
      args.push '--user', this._escape options.user
    this._run 'startservice', args

module.exports = StartServiceCommand
