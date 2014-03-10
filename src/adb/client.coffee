Monkey = require 'adbkit-monkey'
Logcat = require 'adbkit-logcat'
Promise = require 'bluebird'
debug = require('debug')('adb:client')

Connection = require './connection'
Sync = require './sync'
ProcStat = require './proc/stat'

HostVersionCommand = require './command/host/version'
HostDevicesCommand = require './command/host/devices'
HostDevicesWithPathsCommand = require './command/host/deviceswithpaths'
HostTrackDevicesCommand = require './command/host/trackdevices'
HostKillCommand = require './command/host/kill'
HostTransportCommand = require './command/host/transport'

ClearCommand = require './command/host-transport/clear'
FrameBufferCommand = require './command/host-transport/framebuffer'
GetFeaturesCommand = require './command/host-transport/getfeatures'
GetPackagesCommand = require './command/host-transport/getpackages'
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
WaitBootCompleteCommand = require './command/host-transport/waitbootcomplete'

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
    resolver = Promise.defer()
    conn = new Connection(@options)
      .on 'error', errorListener = (err) ->
        resolver.reject err
      .on 'connect', connectListener = ->
        resolver.resolve conn
      .connect()
    resolver.promise.finally ->
      conn.removeListener 'error', errorListener
      conn.removeListener 'connect', connectListener

  version: ->
    this.connection()
      .then (conn) ->
        new HostVersionCommand conn
          .execute()

  listDevices: ->
    this.connection()
      .then (conn) ->
        new HostDevicesCommand conn
          .execute()

  listDevicesWithPaths: ->
    this.connection()
      .then (conn) ->
        new HostDevicesWithPathsCommand conn
          .execute()

  trackDevices: ->
    this.connection()
      .then (conn) ->
        new HostTrackDevicesCommand conn
          .execute()

  kill: ->
    this.connection()
      .then (conn) ->
        new HostKillCommand conn
          .execute()

  getSerialNo: (serial) ->
    this.connection()
      .then (conn) ->
        new GetSerialNoCommand conn
          .execute serial

  getDevicePath: (serial) ->
    this.connection()
      .then (conn) ->
        new GetDevicePathCommand conn
          .execute serial

  getState: (serial) ->
    this.connection()
      .then (conn) ->
        new GetStateCommand conn
          .execute serial

  getProperties: (serial) ->
    this.transport serial
      .then (transport) ->
        new GetPropertiesCommand transport
          .execute()

  getFeatures: (serial) ->
    this.transport serial
      .then (transport) ->
        new GetFeaturesCommand transport
          .execute()

  getPackages: (serial) ->
    this.transport serial
      .then (transport) ->
        new GetPackagesCommand transport
          .execute()

  forward: (serial, local, remote) ->
    this.connection()
      .then (conn) ->
        new ForwardCommand conn
          .execute serial, local, remote

  listForwards: (serial) ->
    this.connection()
      .then (conn) ->
        new ListForwardsCommand conn
          .execute serial

  transport: (serial) ->
    this.connection()
      .then (conn) ->
        new HostTransportCommand conn
          .execute serial
          .return conn

  shell: (serial, command) ->
    this.transport serial
      .then (transport) ->
        new ShellCommand transport
          .execute command

  remount: (serial) ->
    this.transport serial
      .then (transport) ->
        new RemountCommand transport
          .execute()

  framebuffer: (serial, format = 'raw') ->
    this.transport serial
      .then (transport) ->
        new FrameBufferCommand transport
          .execute format

  screencap: (serial) ->
    this.transport serial
      .then (transport) =>
        new ScreencapCommand transport
          .execute()
          .catch (err) =>
            debug "Emulating screencap command due to '#{err}'"
            this.framebuffer serial, 'png'
              .then (info, framebuffer) ->
                framebuffer

  openLog: (serial, name) ->
    this.transport serial
      .then (transport) ->
        new LogCommand transport
          .execute name

  openTcp: (serial, port, host) ->
    this.transport serial
      .then (transport) ->
        new TcpCommand transport
          .execute port, host

  openMonkey: (serial, port = 1080) ->
    tryConnect = (times) =>
      this.openTcp serial, port
        .then (stream) ->
          Monkey.connectStream stream
        .catch (err) ->
          if times -= 1
            debug "Monkey can't be reached, trying #{times} more times"
            Promise.delay 100
              .then ->
                tryConnect times
          else
            throw err
    tryConnect 1
      .catch (err) ->
        this.transport serial
          .then (transport) ->
            new MonkeyCommand transport
              .execute port
              .then ->
                tryConnect 20

  openLogcat: (serial) ->
    this.transport serial
      .then (transport) ->
        new LogcatCommand transport
          .execute (stream) ->
            Logcat.readStream stream,
              fixLineFeeds: false

  openProcStat: (serial) ->
    this.syncService serial
      .then (sync) ->
        new ProcStat sync

  clear: (serial, pkg) ->
    this.transport serial
      .then (transport) ->
        new ClearCommand transport
          .execute pkg

  install: (serial, apk) ->
    temp = Sync.temp if typeof apk is 'string' then apk else '_stream.apk'
    this.push serial, apk, temp
      .then (transfer) =>
        resolver = Promise.defer()

        transfer.on 'error', errorListener = (err) ->
          resolver.reject err

        transfer.on 'end', endListener = =>
          resolver.resolve this.transport serial
            .then (transport) =>
              new InstallCommand transport
                .execute temp
                .then =>
                  this.shell serial, ['rm', '-f', temp]
                .then (out) ->
                  true

        resolver.promise.finally ->
          transfer.removeListener 'error', errorListener
          transfer.removeListener 'end', endListener

  uninstall: (serial, pkg) ->
    this.transport serial
      .then (transport) ->
        new UninstallCommand transport
          .execute pkg

  isInstalled: (serial, pkg) ->
    this.transport serial
      .then (transport) ->
        new IsInstalledCommand transport
          .execute pkg

  startActivity: (serial, options) ->
    this.transport serial
      .then (transport) ->
        new StartActivityCommand transport
          .execute options

  syncService: (serial) ->
    this.transport serial
      .then (transport) ->
        new SyncCommand transport
          .execute()

  stat: (serial, path) ->
    this.syncService serial
      .then (sync) ->
        sync.stat path
          .finally ->
            sync.end()

  readdir: (serial, path) ->
    this.syncService serial
      .then (sync) ->
        sync.readdir path
          .finally ->
            sync.end()

  pull: (serial, path) ->
    this.syncService serial
      .then (sync) ->
        sync.pull path
          .on 'end', ->
            sync.end()

  push: (serial, contents, path, mode) ->
    this.syncService serial
      .then (sync) ->
        sync.push contents, path, mode
          .on 'end', ->
            sync.end()

  waitBootComplete: (serial) ->
    this.transport serial
      .then (transport) ->
        new WaitBootCompleteCommand transport
          .execute()

module.exports = Client
