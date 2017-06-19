/* eslint-disable
    no-cond-assign,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
const Monkey = require('adbkit-monkey')
const Logcat = require('adbkit-logcat')
const Promise = require('bluebird')
const debug = require('debug')('adb:client')

const Connection = require('./connection')
const Sync = require('./sync')
const Parser = require('./parser')
const ProcStat = require('./proc/stat')

const HostVersionCommand = require('./command/host/version')
const HostConnectCommand = require('./command/host/connect')
const HostDevicesCommand = require('./command/host/devices')
const HostDevicesWithPathsCommand = require('./command/host/deviceswithpaths')
const HostDisconnectCommand = require('./command/host/disconnect')
const HostTrackDevicesCommand = require('./command/host/trackdevices')
const HostKillCommand = require('./command/host/kill')
const HostTransportCommand = require('./command/host/transport')

const ClearCommand = require('./command/host-transport/clear')
const FrameBufferCommand = require('./command/host-transport/framebuffer')
const GetFeaturesCommand = require('./command/host-transport/getfeatures')
const GetPackagesCommand = require('./command/host-transport/getpackages')
const GetPropertiesCommand = require('./command/host-transport/getproperties')
const InstallCommand = require('./command/host-transport/install')
const IsInstalledCommand = require('./command/host-transport/isinstalled')
const ListReversesCommand = require('./command/host-transport/listreverses')
const LocalCommand = require('./command/host-transport/local')
const LogcatCommand = require('./command/host-transport/logcat')
const LogCommand = require('./command/host-transport/log')
const MonkeyCommand = require('./command/host-transport/monkey')
const RebootCommand = require('./command/host-transport/reboot')
const RemountCommand = require('./command/host-transport/remount')
const RootCommand = require('./command/host-transport/root')
const ReverseCommand = require('./command/host-transport/reverse')
const ScreencapCommand = require('./command/host-transport/screencap')
const ShellCommand = require('./command/host-transport/shell')
const StartActivityCommand = require('./command/host-transport/startactivity')
const StartServiceCommand = require('./command/host-transport/startservice')
const SyncCommand = require('./command/host-transport/sync')
const TcpCommand = require('./command/host-transport/tcp')
const TcpIpCommand = require('./command/host-transport/tcpip')
const TrackJdwpCommand = require('./command/host-transport/trackjdwp')
const UninstallCommand = require('./command/host-transport/uninstall')
const UsbCommand = require('./command/host-transport/usb')
const WaitBootCompleteCommand = require('./command/host-transport/waitbootcomplete')

const ForwardCommand = require('./command/host-serial/forward')
const GetDevicePathCommand = require('./command/host-serial/getdevicepath')
const GetSerialNoCommand = require('./command/host-serial/getserialno')
const GetStateCommand = require('./command/host-serial/getstate')
const ListForwardsCommand = require('./command/host-serial/listforwards')
const WaitForDeviceCommand = require('./command/host-serial/waitfordevice')

const TcpUsbServer = require('./tcpusb/server')

var Client = (function() {
  let NoUserOptionError = undefined
  Client = class Client {
    static initClass() {
  
      NoUserOptionError = err => err.message.indexOf('--user') !== -1
    }
    constructor(options = {}) {
      this.options = options
      if (!this.options.port) { this.options.port = 5037 }
      if (!this.options.bin) { this.options.bin = 'adb' }
    }

    createTcpUsbBridge(serial, options) {
      return new TcpUsbServer(this, serial, options)
    }

    connection() {
      let connectListener, errorListener
      const resolver = Promise.defer()
      var conn = new Connection(this.options)
        .on('error', (errorListener = err => resolver.reject(err))).on('connect', (connectListener = () => resolver.resolve(conn))).connect()
      return resolver.promise.finally(function() {
        conn.removeListener('error', errorListener)
        return conn.removeListener('connect', connectListener)
      })
    }

    version(callback) {
      return this.connection()
        .then(conn =>
          new HostVersionCommand(conn)
            .execute()).nodeify(callback)
    }

    connect(host, port = 5555, callback) {
      if (typeof port === 'function') {
        callback = port
        port = 5555
      }
      if (host.indexOf(':') !== -1) {
        [host, port] = Array.from(host.split(':', 2))
      }
      return this.connection()
        .then(conn =>
          new HostConnectCommand(conn)
            .execute(host, port)).nodeify(callback)
    }

    disconnect(host, port = 5555, callback) {
      if (typeof port === 'function') {
        callback = port
        port = 5555
      }
      if (host.indexOf(':') !== -1) {
        [host, port] = Array.from(host.split(':', 2))
      }
      return this.connection()
        .then(conn =>
          new HostDisconnectCommand(conn)
            .execute(host, port)).nodeify(callback)
    }

    listDevices(callback) {
      return this.connection()
        .then(conn =>
          new HostDevicesCommand(conn)
            .execute()).nodeify(callback)
    }

    listDevicesWithPaths(callback) {
      return this.connection()
        .then(conn =>
          new HostDevicesWithPathsCommand(conn)
            .execute()).nodeify(callback)
    }

    trackDevices(callback) {
      return this.connection()
        .then(conn =>
          new HostTrackDevicesCommand(conn)
            .execute()).nodeify(callback)
    }

    kill(callback) {
      return this.connection()
        .then(conn =>
          new HostKillCommand(conn)
            .execute()).nodeify(callback)
    }

    getSerialNo(serial, callback) {
      return this.connection()
        .then(conn =>
          new GetSerialNoCommand(conn)
            .execute(serial)).nodeify(callback)
    }

    getDevicePath(serial, callback) {
      return this.connection()
        .then(conn =>
          new GetDevicePathCommand(conn)
            .execute(serial)).nodeify(callback)
    }

    getState(serial, callback) {
      return this.connection()
        .then(conn =>
          new GetStateCommand(conn)
            .execute(serial)).nodeify(callback)
    }

    getProperties(serial, callback) {
      return this.transport(serial)
        .then(transport =>
          new GetPropertiesCommand(transport)
            .execute()).nodeify(callback)
    }

    getFeatures(serial, callback) {
      return this.transport(serial)
        .then(transport =>
          new GetFeaturesCommand(transport)
            .execute()).nodeify(callback)
    }

    getPackages(serial, callback) {
      return this.transport(serial)
        .then(transport =>
          new GetPackagesCommand(transport)
            .execute()).nodeify(callback)
    }

    getDHCPIpAddress(serial, iface = 'wlan0', callback) {
      if (typeof iface === 'function') {
        callback = iface
        iface = 'wlan0'
      }
      return this.getProperties(serial)
        .then(function(properties) {
          let ip
          if (ip = properties[`dhcp.${iface}.ipaddress`]) { return ip }
          throw new Error(`Unable to find ipaddress for '${iface}'`)
        })
    }

    forward(serial, local, remote, callback) {
      return this.connection()
        .then(conn =>
          new ForwardCommand(conn)
            .execute(serial, local, remote)).nodeify(callback)
    }

    listForwards(serial, callback) {
      return this.connection()
        .then(conn =>
          new ListForwardsCommand(conn)
            .execute(serial)).nodeify(callback)
    }

    reverse(serial, remote, local, callback) {
      return this.transport(serial)
        .then(transport =>
          new ReverseCommand(transport)
            .execute(remote, local)
            .nodeify(callback)
        )
    }

    listReverses(serial, callback) {
      return this.transport(serial)
        .then(transport =>
          new ListReversesCommand(transport)
            .execute()).nodeify(callback)
    }

    transport(serial, callback) {
      return this.connection()
        .then(conn =>
          new HostTransportCommand(conn)
            .execute(serial)
            .return(conn)).nodeify(callback)
    }

    shell(serial, command, callback) {
      return this.transport(serial)
        .then(transport =>
          new ShellCommand(transport)
            .execute(command)).nodeify(callback)
    }

    reboot(serial, callback) {
      return this.transport(serial)
        .then(transport =>
          new RebootCommand(transport)
            .execute()).nodeify(callback)
    }

    remount(serial, callback) {
      return this.transport(serial)
        .then(transport =>
          new RemountCommand(transport)
            .execute()).nodeify(callback)
    }
      
    root(serial, callback) {
      return this.transport(serial)
        .then(transport =>
          new RootCommand(transport)
            .execute()).nodeify(callback)
    }

    trackJdwp(serial, callback) {
      return this.transport(serial)
        .then(transport =>
          new TrackJdwpCommand(transport)
            .execute()).nodeify(callback)
    }

    framebuffer(serial, format = 'raw', callback) {
      if (typeof format === 'function') {
        callback = format
        format = 'raw'
      }
      return this.transport(serial)
        .then(transport =>
          new FrameBufferCommand(transport)
            .execute(format)).nodeify(callback)
    }

    screencap(serial, callback) {
      return this.transport(serial)
        .then(transport => {
          return new ScreencapCommand(transport)
            .execute()
            .catch(err => {
              debug(`Emulating screencap command due to '${err}'`)
              return this.framebuffer(serial, 'png')
            })
        }).nodeify(callback)
    }

    openLocal(serial, path, callback) {
      return this.transport(serial)
        .then(transport =>
          new LocalCommand(transport)
            .execute(path)).nodeify(callback)
    }

    openLog(serial, name, callback) {
      return this.transport(serial)
        .then(transport =>
          new LogCommand(transport)
            .execute(name)).nodeify(callback)
    }

    openTcp(serial, port, host, callback) {
      if (typeof host === 'function') {
        callback = host
        host = undefined
      }
      return this.transport(serial)
        .then(transport =>
          new TcpCommand(transport)
            .execute(port, host)).nodeify(callback)
    }

    openMonkey(serial, port = 1080, callback) {
      if (typeof port === 'function') {
        callback = port
        port = 1080
      }
      var tryConnect = times => {
        return this.openTcp(serial, port)
          .then(stream => Monkey.connectStream(stream)).catch(function(err) {
            if (times -= 1) {
              debug(`Monkey can't be reached, trying ${times} more times`)
              return Promise.delay(100)
                .then(() => tryConnect(times))
            } else {
              throw err
            }
          })
      }
      return tryConnect(1)
        .catch(err => {
          return this.transport(serial)
            .then(transport =>
              new MonkeyCommand(transport)
                .execute(port)).then(out =>
              tryConnect(20)
                .then(monkey =>
                  monkey.once('end', () => out.end())
                )
            )
        }).nodeify(callback)
    }

    openLogcat(serial, options, callback) {
      if (typeof options === 'function') {
        callback = options
        options = {}
      }
      return this.transport(serial)
        .then(transport =>
          new LogcatCommand(transport)
            .execute(options)).then(stream =>
          Logcat.readStream(stream,
            {fixLineFeeds: false})).nodeify(callback)
    }

    openProcStat(serial, callback) {
      return this.syncService(serial)
        .then(sync => new ProcStat(sync)).nodeify(callback)
    }

    clear(serial, pkg, callback) {
      return this.transport(serial)
        .then(transport =>
          new ClearCommand(transport)
            .execute(pkg)).nodeify(callback)
    }

    install(serial, apk, callback) {
      const temp = Sync.temp(typeof apk === 'string' ? apk : '_stream.apk')
      return this.push(serial, apk, temp)
        .then(transfer => {
          let endListener, errorListener
          const resolver = Promise.defer()

          transfer.on('error', (errorListener = err => resolver.reject(err))
          )

          transfer.on('end', (endListener = () => {
            return resolver.resolve(this.installRemote(serial, temp))
          })
          )

          return resolver.promise.finally(function() {
            transfer.removeListener('error', errorListener)
            return transfer.removeListener('end', endListener)
          })
        }).nodeify(callback)
    }

    installRemote(serial, apk, callback) {
      return this.transport(serial)
        .then(transport => {
          return new InstallCommand(transport)
            .execute(apk)
            .then(() => {
              return this.shell(serial, ['rm', '-f', apk])
            })
            .then(stream =>
              new Parser(stream)
                .readAll()).then(out => true)
        }).nodeify(callback)
    }

    uninstall(serial, pkg, callback) {
      return this.transport(serial)
        .then(transport =>
          new UninstallCommand(transport)
            .execute(pkg)).nodeify(callback)
    }

    isInstalled(serial, pkg, callback) {
      return this.transport(serial)
        .then(transport =>
          new IsInstalledCommand(transport)
            .execute(pkg)).nodeify(callback)
    }

    startActivity(serial, options, callback) {
      return this.transport(serial)
        .then(transport =>
          new StartActivityCommand(transport)
            .execute(options)).catch(NoUserOptionError, () => {
          options.user = null
          return this.startActivity(serial, options)
        }).nodeify(callback)
    }

    startService(serial, options, callback) {
      return this.transport(serial)
        .then(function(transport) {
          if (!options.user && (options.user !== null)) { options.user = 0 }
          return new StartServiceCommand(transport)
            .execute(options)}).catch(NoUserOptionError, () => {
          options.user = null
          return this.startService(serial, options)
        }).nodeify(callback)
    }

    syncService(serial, callback) {
      return this.transport(serial)
        .then(transport =>
          new SyncCommand(transport)
            .execute()).nodeify(callback)
    }

    stat(serial, path, callback) {
      return this.syncService(serial)
        .then(sync =>
          sync.stat(path)
            .finally(() => sync.end())).nodeify(callback)
    }

    readdir(serial, path, callback) {
      return this.syncService(serial)
        .then(sync =>
          sync.readdir(path)
            .finally(() => sync.end())).nodeify(callback)
    }

    pull(serial, path, callback) {
      return this.syncService(serial)
        .then(sync =>
          sync.pull(path)
            .on('end', () => sync.end())).nodeify(callback)
    }

    push(serial, contents, path, mode, callback) {
      if (typeof mode === 'function') {
        callback = mode
        mode = undefined
      }
      return this.syncService(serial)
        .then(sync =>
          sync.push(contents, path, mode)
            .on('end', () => sync.end())).nodeify(callback)
    }

    tcpip(serial, port = 5555, callback) {
      if (typeof port === 'function') {
        callback = port
        port = 5555
      }
      return this.transport(serial)
        .then(transport =>
          new TcpIpCommand(transport)
            .execute(port)).nodeify(callback)
    }

    usb(serial, callback) {
      return this.transport(serial)
        .then(transport =>
          new UsbCommand(transport)
            .execute()).nodeify(callback)
    }

    waitBootComplete(serial, callback) {
      return this.transport(serial)
        .then(transport =>
          new WaitBootCompleteCommand(transport)
            .execute()).nodeify(callback)
    }

    waitForDevice(serial, callback) {
      return this.connection()
        .then(conn =>
          new WaitForDeviceCommand(conn)
            .execute(serial)).nodeify(callback)
    }
  }
  Client.initClass()
  return Client
})()

module.exports = Client
