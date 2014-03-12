{EventEmitter} = require 'events'
Promise = require 'bluebird'

Parser = require './parser'

class Tracker extends EventEmitter
  constructor: (@command) ->
    @deviceList = []
    @deviceMap = {}
    @reader = this.read()
      .catch Parser.PrematureEOFError, (err) =>
        this.emit 'end'
      .catch Promise.CancellationError, (err) =>
        @command.connection.end()
        this.emit 'end'
      .catch (err) =>
        this.emit 'error', err
        this.emit 'end'

  read: ->
    @command._readDevices()
      .cancellable()
      .then (list) =>
        this.update list
        this.read()

  update: (newList) ->
    changeSet =
      removed: []
      changed: []
      added: []
    newMap = {}
    for device in newList
      oldDevice = @deviceMap[device.id]
      if oldDevice
        unless oldDevice.type is device.type
          changeSet.changed.push device
          this.emit 'change', device, oldDevice
      else
        changeSet.added.push device
        this.emit 'add', device
      newMap[device.id] = device
    for device in @deviceList
      unless newMap[device.id]
        changeSet.removed.push device
        this.emit 'remove', device
    this.emit 'changeSet', changeSet
    @deviceList = newList
    @deviceMap = newMap
    return this

  end: ->
    @reader.cancel()
    return this

module.exports = Tracker
