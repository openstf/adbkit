Monkey = require 'stf-monkey'
Logcat = require 'stf-logcat'
debug = require('debug')('adb:client')

Connection = require './connection'
Sync = require './sync'
HostVersionCommand = require './command/hostversion'
HostDevicesCommand = require './command/hostdevices'
HostDevicesWithPathsCommand = require './command/hostdeviceswithpaths'
HostTrackDevicesCommand = require './command/hosttrackdevices'
HostKillCommand = require './command/hostkill'
HostTransportCommand = require './command/hosttransport'

FrameBufferCommand = require './command/host-transport/framebuffer'
GetFeaturesCommand = require './command/host-transport/getfeatures'
GetPropertiesCommand = require './command/host-transport/getproperties'
InstallCommand = require './command/host-transport/install'
IsInstalledCommand = require './command/host-transport/isinstalled'
LogcatCommand = require './command/host-transport/logcat'
LogCommand = require './command/host-transport/log'
MonkeyCommand = require './command/host-transport/monkey'
RemountCommand = require './command/host-transport/remount'
ScreencapCommand = require './command/host-transport/screencap'
ShellCommand = require './command/host-transport/shell'
StartActivityCommand = require './command/host-transport/startactivity'
SyncCommand = require './command/host-transport/sync'
TcpCommand = require './command/host-transport/tcp'
UninstallCommand = require './command/host-transport/uninstall'

ForwardCommand = require './command/host-serial/forward'
GetDevicePathCommand = require './command/host-serial/getdevicepath'
GetSerialNoCommand = require './command/host-serial/getserialno'
GetStateCommand = require './command/host-serial/getstate'
ListForwardsCommand = require './command/host-serial/listforwards'

class Client
  constructor: (@options = {}) ->
    @options.port ||= 5037
    @options.bin ||= 'adb'

  connection: ->
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

  getProperties: (serial, callback) ->
    this.transport serial, (err, transport) ->
      return callback err if err
      new GetPropertiesCommand(transport)
        .execute callback

  getFeatures: (serial, callback) ->
    this.transport serial, (err, transport) ->
      return callback err if err
      new GetFeaturesCommand(transport)
        .execute callback

  forward: (serial, local, remote, callback) ->
    this.connection()
      .on 'connect', ->
        new ForwardCommand(this)
          .execute serial, local, remote, callback
      .on 'error', callback
    return this

  listForwards: (serial, callback) ->
    this.connection()
      .on 'connect', ->
        new ListForwardsCommand(this)
          .execute serial, callback
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

  screencap: (serial, callback) ->
    this.transport serial, (err, transport) ->
      return callback err if err
      new ScreencapCommand(transport)
        .execute callback

  openLog: (serial, name, callback) ->
    this.transport serial, (err, transport) ->
      return callback err if err
      new LogCommand(transport)
        .execute name, callback

  openTcp: (serial, port, host, callback) ->
    if arguments.length is 3
      callback = host
      host = undefined
    this.transport serial, (err, transport) ->
      return callback err if err
      new TcpCommand(transport)
        .execute port, host, callback

  openMonkey: (serial, port, callback) ->
    if arguments.length is 2
      callback = port
      port = 1080
    this.transport serial, (err, transport) =>
      return callback err if err
      new MonkeyCommand(transport)
        .execute port, (err) =>
          return callback err if err
          retries = 10
          connect = =>
            this.openTcp serial, port, (err, stream) =>
              if err and retries -= 1
                debug "Monkey can't be reached, trying #{retries} more times"
                setTimeout connect, 100
              else if err
                callback err
              else
                callback null, Monkey.connectStream stream
          connect()

  openLogcat: (serial, callback) ->
    this.transport serial, (err, transport) =>
      return callback err if err
      new LogcatCommand(transport)
        .execute (err, stream) =>
          return callback err if err
          callback null, Logcat.readStream stream, fixLineFeeds: false

  install: (serial, apk, callback) ->
    temp = Sync.temp apk
    this.push serial, apk, temp, (err, transfer) =>
      transfer.on 'end', =>
        this.transport serial, (err, transport) =>
          return callback err if err
          new InstallCommand(transport)
            .execute temp, (err) =>
              return callback err if err
              this.shell serial, "rm -f #{temp}", (err, out) ->
                callback err

  uninstall: (serial, pkg, callback) ->
    this.transport serial, (err, transport) ->
      return callback err if err
      new UninstallCommand(transport)
        .execute pkg, callback

  isInstalled: (serial, pkg, callback) ->
    this.transport serial, (err, transport) ->
      return callback err if err
      new IsInstalledCommand(transport)
        .execute pkg, callback

  startActivity: (serial, options, callback) ->
    this.transport serial, (err, transport) ->
      return callback err if err
      new StartActivityCommand(transport)
        .execute options, callback

  syncService: (serial, callback) ->
    this.transport serial, (err, transport) ->
      return callback err if err
      new SyncCommand(transport)
        .execute callback

  stat: (serial, path, callback) ->
    this.syncService serial, (err, sync) ->
      return callback err if err
      sync.stat path, (err, stats) ->
        sync.end()
        return callback err if err
        callback null, stats

  pull: (serial, path, callback) ->
    this.syncService serial, (err, sync) ->
      return callback err if err
      transfer = sync.pull path, callback
      transfer.on 'end', ->
        sync.end()

  push: (serial, contents, path, mode, callback) ->
    if typeof mode is 'function'
      callback = mode
      mode = undefined
    this.syncService serial, (err, sync) ->
      return callback err if err
      transfer = sync.push contents, path, mode, callback
      transfer.on 'end', ->
        sync.end()

module.exports = Client
