Monkey = require 'stf-monkey'
Logcat = require 'stf-logcat'
debug = require('debug')('adb:client')

Connection = require './connection'
HostVersionCommand = require './command/hostversion'
HostDevicesCommand = require './command/hostdevices'
HostDevicesWithPathsCommand = require './command/hostdeviceswithpaths'
HostTrackDevicesCommand = require './command/hosttrackdevices'
HostKillCommand = require './command/hostkill'
GetSerialNoCommand = require './command/getserialno'
GetDevicePathCommand = require './command/getdevicepath'
GetStateCommand = require './command/getstate'
GetPropertiesCommand = require './command/getproperties'
GetFeaturesCommand = require './command/getfeatures'
ForwardCommand = require './command/forward'
HostTransportCommand = require './command/hosttransport'
ShellCommand = require './command/shell'
RemountCommand = require './command/remount'
LogCommand = require './command/log'
TcpCommand = require './command/tcp'
FrameBufferCommand = require './command/framebuffer'
ScreencapCommand = require './command/screencap'
MonkeyCommand = require './command/monkey'
LogcatCommand = require './command/logcat'
UninstallCommand = require './command/uninstall'
IsInstalledCommand = require './command/isinstalled'

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

module.exports = Client
