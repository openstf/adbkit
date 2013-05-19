Connection = require './adb/connection'

class Adb
  @connect: (options) ->
    new Connection options

  @version: (callback) ->
    Adb.connect()
      .queue new HostVersionCommand
      .execute callback

  @kill: (callback) ->
    Adb.connect()
      .queue new HostKillCommand
      .execute callback

  @devices: (callback) ->
    Adb.connect()
      .queue new DevicesCommand
      .execute callback

  @devicesAndPaths: (callback) ->
    Adb.connect()
      .queue new DevicesWithPathsCommand
      .execute callback

  @trackDevices: (callback) ->
    Adb.connect()
      .queue new TrackDevicesCommand
      .execute callback

  @getProduct: (serial, callback) ->
    Adb.connect()
      .queue new GetProductCommand serial
      .execute callback

  @getSerialNo: (serial, callback) ->
    Adb.connect()
      .queue new GetSerialNoCommand serial
      .execute callback

  @getDevPath: (serial, callback) ->
    Adb.connect()
      .queue new GetDevPathCommand serial
      .execute callback

  @getState: (serial, callback) ->
    Adb.connect()
      .queue new GetStateCommand serial
      .execute callback

  @forward: (serial, local, remote, callback) ->
    Adb.connect()
      .queue new ForwardCommand seria, local, remote
      .execute callback

  @forwardNoRebind: (serial, local, remote, callback) ->
    Adb.connect()
      .queue new ForwardNoRebindCommand serial, local, remote
      .execute callback

  @killForward: (serial, local, callback) ->
    Adb.connect()
      .queue new KillForwardCommand serial, local
      .execute callback

  @killForwardAll: (serial, local, callback) ->
    Adb.connect()
      .queue new KillForwardAllCommand serial
      .execute callback

  @listForward: (serial, local, callback) ->
    Adb.connect()
      .queue new ListForwardCommand serial
      .execute callback

  @shell: (serial, command, callback) ->
    Adb.connect()
      .queue new HostTransportCommand serial
      .queue new ShellCommand command
      .execute callback

  @interactiveShell: (serial, callback) ->
    Adb.connect()
      .queue new HostTransportCommand serial
      .queue new InteractiveShellCommand
      .execute callback

  @remount: (serial, callback) ->
    Adb.connect()
      .queue new HostTransportCommand serial
      .queue new RemountCommand
      .execute callback

  @openDeviceFile: (serial, path, callback) ->
    Adb.connect()
      .queue new HostTransportCommand serial
      .queue new DevCommand path
      .execute callback

  @openTcp: (serial, port, host, callback) ->
    Adb.connect()
      .queue new HostTransportCommand serial
      .queue new TcpCommand port, host
      .execute callback

  @openLocal: (serial, path, callback) ->
    Adb.connect()
      .queue new HostTransportCommand serial
      .queue new LocalCommand path
      .execute callback

  @openLocalReserved: (serial, path, callback) ->
    Adb.connect()
      .queue new HostTransportCommand serial
      .queue new LocalReservedCommand path
      .execute callback

  @openLocalAbstract: (serial, path, callback) ->
    Adb.connect()
      .queue new HostTransportCommand serial
      .queue new LocalAbstractCommand path
      .execute callback

  @openLocalFileSystem: (serial, path, callback) ->
    Adb.connect()
      .queue new HostTransportCommand serial
      .queue new LocalFileSystemCommand path
      .execute callback

  @openLog: (serial, name, callback) ->
    Adb.connect()
      .queue new HostTransportCommand serial
      .queue new LogCommand name
      .execute callback

  @frameBuffer: (serial, callback) ->
    Adb.connect()
      .queue new HostTransportCommand serial
      .queue new FrameBufferCommand
      .execute callback

  @dns: (serial, address, callback) ->
    Adb.connect()
      .queue new HostTransportCommand serial
      .queue new DnsCommand address
      .execute callback

  @recover: (serial, size, callback) ->
    Adb.connect()
      .queue new HostTransportCommand serial
      .queue new RecoverCommand size
      .execute callback

  @openJdwp: (serial, pid, callback) ->
    Adb.connect()
      .queue new HostTransportCommand serial
      .queue new JdwpCommand pid
      .execute callback

  @trackJdwp: (serial, callback) ->
    Adb.connect()
      .queue new HostTransportCommand serial
      .queue new TrackJdwpCommand
      .execute callback

  @sync: (serial, callback) ->
    Adb.connect()
      .queue new HostTransportCommand serial
      .queue new SyncCommand
      .execute callback

module.exports = Adb
