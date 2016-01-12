Net = require 'net'
debug = require('debug')('adb:connection')
{EventEmitter} = require 'events'
{execFile} = require 'child_process'

Parser = require './parser'
dump = require './dump'

class Connection extends EventEmitter
  constructor: (@options) ->
    @socket = null
    @parser = null
    @triedStarting = false

  connect: ->
    @socket = Net.connect @options
    @socket.setNoDelay true
    @parser = new Parser @socket
    @socket.on 'connect', =>
      this.emit 'connect'
    @socket.on 'end', =>
      this.emit 'end'
    @socket.on 'drain', =>
      this.emit 'drain'
    @socket.on 'timeout', =>
      this.emit 'timeout'
    @socket.on 'error', (err) =>
      this._handleError err
    @socket.on 'close', (hadError) =>
      this.emit 'close', hadError
    return this

  end: ->
    @socket.end()
    return this

  write: (data, callback) ->
    @socket.write dump(data), callback
    return this

  startServer: (callback) ->
    debug "Starting ADB server via '#{@options.bin} start-server'"
    return this._exec ['start-server'], {}, callback

  _exec: (args, options, callback) ->
    debug "CLI: #{@options.bin} #{args.join ' '}"
    execFile @options.bin, args, options, callback
    return this

  _handleError: (err) ->
    if err.code is 'ECONNREFUSED' and not @triedStarting
      debug "Connection was refused, let's try starting the server once"
      @triedStarting = true
      this.startServer (err) =>
        return this._handleError err if err
        this.connect()
    else
      debug "Connection had an error: #{err.message}"
      this.emit 'error', err
      this.end()
    return

module.exports = Connection
