Connection = require './connection'
HostVersionCommand = require './command/hostversion'
HostDevicesCommand = require './command/hostdevices'
HostDevicesWithPathsCommand = require './command/hostdeviceswithpaths'
HostTrackDevicesCommand = require './command/hosttrackdevices'
HostKillCommand = require './command/hostkill'
GetSerialNoCommand = require './command/getserialno'
GetDevicePathCommand = require './command/getdevicepath'
GetStateCommand = require './command/getstate'
ForwardCommand = require './command/forward'
HostTransportCommand = require './command/hosttransport'
ShellCommand = require './command/shell'
RemountCommand = require './command/remount'
FrameBufferCommand = require './command/framebuffer'

class Client
  constructor: (@options = {}) ->
    @options.port ||= 5037
    @options.bin ||= 'adb'

  connection: (callback) ->
    new Connection(@options)
      .connect()

  version: (callback) ->
    this.connection()
      .on 'connect', ->
        new HostVersionCommand(this)
          .execute callback
      .on 'error', callback
    return this

  listDevices: (callback) ->
    this.connection()
      .on 'connect', ->
        new HostDevicesCommand(this)
          .execute callback
      .on 'error', callback
    return this

  listDevicesWithPaths: (callback) ->
    this.connection()
      .on 'connect', ->
        new HostDevicesWithPathsCommand(this)
          .execute callback
      .on 'error', callback
    return this

  trackDevices: (callback) ->
    this.connection()
      .on 'connect', ->
        new HostTrackDevicesCommand(this)
          .execute callback
      .on 'error', callback
    return this

  kill: (callback) ->
    this.connection()
      .on 'connect', ->
        new HostKillCommand(this)
          .execute callback
      .on 'error', callback
    return this

  getSerialNo: (serial, callback) ->
    this.connection()
      .on 'connect', ->
        new GetSerialNoCommand(this)
          .execute serial, callback
      .on 'error', callback
    return this

  getDevicePath: (serial, callback) ->
    this.connection()
      .on 'connect', ->
        new GetDevicePathCommand(this)
          .execute serial, callback
      .on 'error', callback
    return this

  getState: (serial, callback) ->
    this.connection()
      .on 'connect', ->
        new GetStateCommand(this)
          .execute serial, callback
      .on 'error', callback
    return this

  forward: (serial, local, remote, callback) ->
    this.connection()
      .on 'connect', ->
        new ForwardCommand(this)
          .execute serial, local, remote, callback
      .on 'error', callback
    return this

  shell: (serial, command, callback) ->
    this.connection()
      .on 'connect', ->
        new HostTransportCommand(this)
          .execute serial, (err) =>
            return callback err if err
            new ShellCommand(this)
              .execute command, callback
      .on 'error', callback
    return this

  remount: (serial, callback) ->
    this.connection()
      .on 'connect', ->
        new HostTransportCommand(this)
          .execute serial, (err) =>
            return callback err if err
            new RemountCommand(this)
              .execute callback
      .on 'error', callback
    return this

  framebuffer: (serial, callback) ->
    this.connection()
      .on 'connect', ->
        new HostTransportCommand(this)
          .execute serial, (err) =>
            return callback err if err
            new FrameBufferCommand(this)
              .execute callback
      .on 'error', callback
    return this

module.exports = Client
