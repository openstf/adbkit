Net = require 'net'
Promise = require 'bluebird'
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
    @socket.on 'close', (hadError) =>
      this.emit 'close', hadError

    return new Promise (resolve, reject) =>
      @socket.once 'connect', resolve
      @socket.once 'error', reject
    .catch (err) =>
      if err.code is 'ECONNREFUSED' and not @triedStarting
        debug "Connection was refused, let's try starting the server once"
        @triedStarting = true
        return this.startServer().then =>
          this.connect()
      else
        this.end()
        throw err
    .then =>
      # Emit unhandled error events, so that they can be handled on the client.
      # Without this, they would just crash node unavoidably.
      @socket.on 'error', (err) =>
        if @socket.listenerCount('error') == 1
          this.emit('error', err)
      return this

  end: ->
    @socket.end()
    return this

  write: (data, callback) ->
    @socket.write dump(data), callback
    return this

  startServer: () ->
    debug "Starting ADB server via '#{@options.bin} start-server'"
    return this._exec ['start-server'], {}

  _exec: (args, options, callback) ->
    debug "CLI: #{@options.bin} #{args.join ' '}"
    return Promise.promisify(execFile)(@options.bin, args, options)

  _handleError: (err) ->
    return

module.exports = Connection
