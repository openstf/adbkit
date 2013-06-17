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
LogCommand = require './command/log'
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

  transport: (serial, callback) ->
    this.connection()
      .on 'connect', ->
        new HostTransportCommand(this)
          .execute serial, (err) =>
            callback err, this
      .on 'error', callback
    return this

  shell: (serial, command, callback) ->
    this.transport serial, (err, transport) ->
      return callback err if err
      new ShellCommand(transport)
        .execute command, callback

  remount: (serial, callback) ->
    this.transport serial, (err, transport) ->
      return callback err if err
      new RemountCommand(transport)
        .execute callback

  framebuffer: (serial, callback) ->
    this.transport serial, (err, transport) ->
      return callback err if err
      new FrameBufferCommand(transport)
        .execute callback

  openLog: (serial, name, callback) ->
    this.transport serial, (err, transport) ->
      return callback err if err
      new LogCommand(transport)
        .execute name, callback

module.exports = Client
