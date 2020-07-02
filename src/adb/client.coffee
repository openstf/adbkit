Monkey = require 'adbkit-monkey'
Logcat = require 'adbkit-logcat'
Promise = require 'bluebird'
debug = require('debug')('adb:client')

Connection = require './connection'
Sync = require './sync'
Parser = require './parser'
ProcStat = require './proc/stat'

HostVersionCommand = require './command/host/version'
HostConnectCommand = require './command/host/connect'
HostDevicesCommand = require './command/host/devices'
HostDevicesWithPathsCommand = require './command/host/deviceswithpaths'
HostDisconnectCommand = require './command/host/disconnect'
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
ListReversesCommand = require './command/host-transport/listreverses'
LocalCommand = require './command/host-transport/local'
LogcatCommand = require './command/host-transport/logcat'
LogCommand = require './command/host-transport/log'
MonkeyCommand = require './command/host-transport/monkey'
RebootCommand = require './command/host-transport/reboot'
RemountCommand = require './command/host-transport/remount'
RootCommand = require './command/host-transport/root'
ReverseCommand = require './command/host-transport/reverse'
ScreencapCommand = require './command/host-transport/screencap'
ShellCommand = require './command/host-transport/shell'
StartActivityCommand = require './command/host-transport/startactivity'
StartServiceCommand = require './command/host-transport/startservice'
SyncCommand = require './command/host-transport/sync'
TcpCommand = require './command/host-transport/tcp'
TcpIpCommand = require './command/host-transport/tcpip'
TrackJdwpCommand = require './command/host-transport/trackjdwp'
UninstallCommand = require './command/host-transport/uninstall'
UsbCommand = require './command/host-transport/usb'
WaitBootCompleteCommand = require './command/host-transport/waitbootcomplete'

ForwardCommand = require './command/host-serial/forward'
GetDevicePathCommand = require './command/host-serial/getdevicepath'
GetSerialNoCommand = require './command/host-serial/getserialno'
GetStateCommand = require './command/host-serial/getstate'
ListForwardsCommand = require './command/host-serial/listforwards'
WaitForDeviceCommand = require './command/host-serial/waitfordevice'

TcpUsbServer = require './tcpusb/server'

class Client
  constructor: (@options = {}) ->
    @options.port ||= 5037
    @options.bin ||= 'adb'

  createTcpUsbBridge: (serial, options) ->
    new TcpUsbServer this, serial, options

  connection: ->
    new Connection(@options).connect()

  version: (callback) ->
    this.connection()
      .then (conn) ->
        new HostVersionCommand conn
          .execute()
      .nodeify callback

  connect: (host, port = 5555, callback) ->
    if typeof port is 'function'
      callback = port
      port = 5555
    if host.indexOf(':') isnt -1
      [host, port] = host.split ':', 2
    this.connection()
      .then (conn) ->
        new HostConnectCommand conn
          .execute host, port
      .nodeify callback

  disconnect: (host, port = 5555, callback) ->
    if typeof port is 'function'
      callback = port
      port = 5555
    if host.indexOf(':') isnt -1
      [host, port] = host.split ':', 2
    this.connection()
      .then (conn) ->
        new HostDisconnectCommand conn
          .execute host, port
      .nodeify callback

  listDevices: (callback) ->
    this.connection()
      .then (conn) ->
        new HostDevicesCommand conn
          .execute()
      .nodeify callback

  listDevicesWithPaths: (callback) ->
    this.connection()
      .then (conn) ->
        new HostDevicesWithPathsCommand conn
          .execute()
      .nodeify callback

  trackDevices: (callback) ->
    this.connection()
      .then (conn) ->
        new HostTrackDevicesCommand conn
          .execute()
      .nodeify callback

  kill: (callback) ->
    this.connection()
      .then (conn) ->
        new HostKillCommand conn
          .execute()
      .nodeify callback

  getSerialNo: (serial, callback) ->
    this.connection()
      .then (conn) ->
        new GetSerialNoCommand conn
          .execute serial
      .nodeify callback

  getDevicePath: (serial, callback) ->
    this.connection()
      .then (conn) ->
        new GetDevicePathCommand conn
          .execute serial
      .nodeify callback

  getState: (serial, callback) ->
    this.connection()
      .then (conn) ->
        new GetStateCommand conn
          .execute serial
      .nodeify callback

  getProperties: (serial, callback) ->
    this.transport serial
      .then (transport) ->
        new GetPropertiesCommand transport
          .execute()
      .nodeify callback

  getFeatures: (serial, callback) ->
    this.transport serial
      .then (transport) ->
        new GetFeaturesCommand transport
          .execute()
      .nodeify callback

  getPackages: (serial, callback) ->
    this.transport serial
      .then (transport) ->
        new GetPackagesCommand transport
          .execute()
      .nodeify callback

  getDHCPIpAddress: (serial, iface = 'wlan0', callback) ->
    if typeof iface is 'function'
      callback = iface
      iface = 'wlan0'
    this.getProperties(serial)
      .then (properties) ->
        return ip if ip = properties["dhcp.#{iface}.ipaddress"]
        throw new Error "Unable to find ipaddress for '#{iface}'"

  forward: (serial, local, remote, callback) ->
    this.connection()
      .then (conn) ->
        new ForwardCommand conn
          .execute serial, local, remote
      .nodeify callback

  listForwards: (serial, callback) ->
    this.connection()
      .then (conn) ->
        new ListForwardsCommand conn
          .execute serial
      .nodeify callback

  reverse: (serial, remote, local, callback) ->
    this.transport serial
      .then (transport) ->
        new ReverseCommand transport
          .execute remote, local
        .nodeify callback

  listReverses: (serial, callback) ->
    this.transport serial
      .then (transport) ->
        new ListReversesCommand transport
          .execute()
      .nodeify callback

  transport: (serial, callback) ->
    this.connection()
      .then (conn) ->
        new HostTransportCommand conn
          .execute serial
          .return conn
      .nodeify callback

  shell: (serial, command, callback) ->
    this.transport serial
      .then (transport) ->
        new ShellCommand transport
          .execute command
      .nodeify callback

  reboot: (serial, callback) ->
    this.transport serial
      .then (transport) ->
        new RebootCommand transport
          .execute()
      .nodeify callback

  remount: (serial, callback) ->
    this.transport serial
      .then (transport) ->
        new RemountCommand transport
          .execute()
      .nodeify callback
      
   root: (serial, callback) ->
    this.transport serial
      .then (transport) ->
        new RootCommand transport
          .execute()
      .nodeify callback

  trackJdwp: (serial, callback) ->
    this.transport serial
      .then (transport) ->
        new TrackJdwpCommand transport
          .execute()
      .nodeify callback

  framebuffer: (serial, format = 'raw', callback) ->
    if typeof format is 'function'
      callback = format
      format = 'raw'
    this.transport serial
      .then (transport) ->
        new FrameBufferCommand transport
          .execute format
      .nodeify callback

  screencap: (serial, callback) ->
    this.transport serial
      .then (transport) =>
        new ScreencapCommand transport
          .execute()
          .catch (err) =>
            debug "Emulating screencap command due to '#{err}'"
            this.framebuffer serial, 'png'
      .nodeify callback

  openLocal: (serial, path, callback) ->
    this.transport serial
      .then (transport) ->
        new LocalCommand transport
          .execute path
      .nodeify callback

  openLog: (serial, name, callback) ->
    this.transport serial
      .then (transport) ->
        new LogCommand transport
          .execute name
      .nodeify callback

  openTcp: (serial, port, host, callback) ->
    if typeof host is 'function'
      callback = host
      host = undefined
    this.transport serial
      .then (transport) ->
        new TcpCommand transport
          .execute port, host
      .nodeify callback

  openMonkey: (serial, port = 1080, callback) ->
    if typeof port is 'function'
      callback = port
      port = 1080
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
      .catch (err) =>
        this.transport serial
          .then (transport) ->
            new MonkeyCommand transport
              .execute port
          .then (out) ->
            tryConnect 20
              .then (monkey) ->
                monkey.once 'end', ->
                  out.end()
      .nodeify callback

  openLogcat: (serial, options, callback) ->
    if typeof options is 'function'
      callback = options
      options = {}
    this.transport serial
      .then (transport) ->
        new LogcatCommand transport
          .execute options
      .then (stream) ->
        Logcat.readStream stream,
          fixLineFeeds: false
      .nodeify callback

  openProcStat: (serial, callback) ->
    this.syncService serial
      .then (sync) ->
        new ProcStat sync
      .nodeify callback

  clear: (serial, pkg, callback) ->
    this.transport serial
      .then (transport) ->
        new ClearCommand transport
          .execute pkg
      .nodeify callback

  install: (serial, apk, callback) ->
    temp = Sync.temp if typeof apk is 'string' then apk else '_stream.apk'
    this.push serial, apk, temp
      .then (transfer) =>
        resolver = Promise.defer()

        transfer.on 'error', errorListener = (err) ->
          resolver.reject err

        transfer.on 'end', endListener = =>
          resolver.resolve this.installRemote serial, temp

        resolver.promise.finally ->
          transfer.removeListener 'error', errorListener
          transfer.removeListener 'end', endListener

      .nodeify callback

  installRemote: (serial, apk, callback) ->
    this.transport serial
      .then (transport) =>
        new InstallCommand transport
          .execute apk
          .then =>
            this.shell serial, ['rm', '-f', apk]
          .then (stream) ->
            new Parser stream
              .readAll()
          .then (out) ->
            true
      .nodeify callback

  uninstall: (serial, pkg, callback) ->
    this.transport serial
      .then (transport) ->
        new UninstallCommand transport
          .execute pkg
      .nodeify callback

  isInstalled: (serial, pkg, callback) ->
    this.transport serial
      .then (transport) ->
        new IsInstalledCommand transport
          .execute pkg
      .nodeify callback

  startActivity: (serial, options, callback) ->
    this.transport serial
      .then (transport) ->
        new StartActivityCommand transport
          .execute options
      .catch NoUserOptionError, =>
        options.user = null
        this.startActivity serial, options
      .nodeify callback

  startService: (serial, options, callback) ->
    this.transport serial
      .then (transport) ->
        options.user = 0 unless options.user or options.user is null
        new StartServiceCommand transport
          .execute options
      .catch NoUserOptionError, =>
        options.user = null
        this.startService serial, options
      .nodeify callback

  syncService: (serial, callback) ->
    this.transport serial
      .then (transport) ->
        new SyncCommand transport
          .execute()
      .nodeify callback

  stat: (serial, path, callback) ->
    this.syncService serial
      .then (sync) ->
        sync.stat path
          .finally ->
            sync.end()
      .nodeify callback

  readdir: (serial, path, callback) ->
    this.syncService serial
      .then (sync) ->
        sync.readdir path
          .finally ->
            sync.end()
      .nodeify callback

  pull: (serial, path, callback) ->
    this.syncService serial
      .then (sync) ->
        sync.pull path
          .on 'end', ->
            sync.end()
      .nodeify callback

  push: (serial, contents, path, mode, callback) ->
    if typeof mode is 'function'
      callback = mode
      mode = undefined
    this.syncService serial
      .then (sync) ->
        sync.push contents, path, mode
          .on 'end', ->
            sync.end()
      .nodeify callback

  tcpip: (serial, port = 5555, callback) ->
    if typeof port is 'function'
      callback = port
      port = 5555
    this.transport serial
      .then (transport) ->
        new TcpIpCommand transport
          .execute port
      .nodeify callback

  usb: (serial, callback) ->
    this.transport serial
      .then (transport) ->
        new UsbCommand transport
          .execute()
      .nodeify callback

  waitBootComplete: (serial, callback) ->
    this.transport serial
      .then (transport) ->
        new WaitBootCompleteCommand transport
          .execute()
      .nodeify callback

  waitForDevice: (serial, callback) ->
    this.connection()
      .then (conn) ->
        new WaitForDeviceCommand conn
          .execute serial
      .nodeify callback

  NoUserOptionError = (err) ->
    err.message.indexOf('--user') isnt -1

module.exports = Client
