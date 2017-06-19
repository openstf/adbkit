// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const {EventEmitter} = require('events')
const Promise = require('bluebird')

const Parser = require('./parser')

class Tracker extends EventEmitter {
  constructor(command) {
    super()
    this.command = command
    this.deviceList = []
    this.deviceMap = {}
    this.reader = this.read()
      .catch(Promise.CancellationError, () => true).catch(Parser.PrematureEOFError, function() {
        throw new Error('Connection closed')
      }).catch(err => {
        this.emit('error', err)
        
      }).finally(() => {
        return this.command.parser.end()
          .then(() => {
            return this.emit('end')
          })
      })
  }

  read() {
    return this.command._readDevices()
      .cancellable()
      .then(list => {
        this.update(list)
        return this.read()
      })
  }

  update(newList) {
    const changeSet = {
      removed: [],
      changed: [],
      added: []
    }
    const newMap = {}
    for (var device of newList) {
      const oldDevice = this.deviceMap[device.id]
      if (oldDevice) {
        if (oldDevice.type !== device.type) {
          changeSet.changed.push(device)
          this.emit('change', device, oldDevice)
        }
      } else {
        changeSet.added.push(device)
        this.emit('add', device)
      }
      newMap[device.id] = device
    }
    for (device of this.deviceList) {
      if (!newMap[device.id]) {
        changeSet.removed.push(device)
        this.emit('remove', device)
      }
    }
    this.emit('changeSet', changeSet)
    this.deviceList = newList
    this.deviceMap = newMap
    return this
  }

  end() {
    this.reader.cancel()
    return this
  }
}

module.exports = Tracker
