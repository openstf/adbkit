{EventEmitter} = require 'events'

Promise = require 'bluebird'

Command = require '../../command'
Protocol = require '../../protocol'
Parser = require '../../parser'

class TrackJdwpCommand extends Command
  execute: ->
    this._send 'track-jdwp'
    @parser.readAscii 4
      .then (reply) =>
        switch reply
          when Protocol.OKAY
            new Tracker this
          when Protocol.FAIL
            @parser.readError()
          else
            @parser.unexpected reply, 'OKAY or FAIL'

  class Tracker extends EventEmitter
    constructor: (command) ->
      super()
      @command = command
      @pids = []
      @pidMap = Object.create null
      @reader = this.read()
        .catch Parser.PrematureEOFError, (err) =>
          this.emit 'end'
        .catch Promise.CancellationError, (err) =>
          @command.connection.end()
          this.emit 'end'
        .catch (err) =>
          @command.connection.end()
          this.emit 'error', err
          this.emit 'end'

    read: ->
      @command.parser.readValue()
        .cancellable()
        .then (list) =>
          pids = list.toString().split '\n'
          pids.push maybeEmpty if maybeEmpty = pids.pop()
          this.update pids

    update: (newList) ->
      changeSet =
        removed: []
        added: []
      newMap = Object.create null
      for pid in newList
        unless @pidMap[pid]
          changeSet.added.push pid
          this.emit 'add', pid
          newMap[pid] = pid
      for pid in @pids
        unless newMap[pid]
          changeSet.removed.push pid
          this.emit 'remove', pid
      @pids = newList
      @pidMap = newMap
      this.emit 'changeSet', changeSet, newList
      return this

    end: ->
      @reader.cancel()
      return this

module.exports = TrackJdwpCommand
