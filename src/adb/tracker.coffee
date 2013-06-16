{EventEmitter} = require 'events'

class Tracker extends EventEmitter
  constructor: ->
    @_oldList = []
    @_oldMap = {}

  update: (devices) ->
    changeSet =
      removed: []
      changed: []
      added: []
    newMap = {}
    for device in devices
      oldDevice = @_oldMap[device.id]
      if oldDevice
        unless oldDevice.type is device.type
          changeSet.changed.push device
          this.emit 'change', device, oldDevice
      else
        changeSet.added.push device
        this.emit 'add', device
      newMap[device.id] = device
    for device in @_oldList
      unless newMap[device.id]
        changeSet.removed.push device
        this.emit 'remove', device
    this.emit 'changeSet', changeSet
    @_oldList = devices
    @_oldMap = newMap
    return this

module.exports = Tracker
