Command = require '../command'
Protocol = require '../protocol'
Tracker = require '../tracker'
HostDevicesCommand = require './hostdevices'

class HostTrackDevicesCommand extends HostDevicesCommand
  execute: (callback) ->
    @parser.readAscii 4, (reply) =>
      switch reply
        when Protocol.OKAY
          tracker = new Tracker @connection
          callback null, tracker
          setImmediate =>
            this._readDevices tracker
        when Protocol.FAIL
          @parser.readError callback
        else
          callback this._unexpected reply
    this._send 'host:track-devices'

  _readDevices: (tracker) ->
    @parser.readValue (value) =>
      tracker.update this._parseDevices value
      setImmediate =>
        this._readDevices tracker
    return this

module.exports = HostTrackDevicesCommand
