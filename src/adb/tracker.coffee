{EventEmitter} = require 'events'

class Tracker extends EventEmitter
  constructor: (@connection) ->
    @deviceList = []
    @deviceMap = {}

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
    @connection.end()
    return this

module.exports = Tracker
