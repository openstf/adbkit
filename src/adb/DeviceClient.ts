import Monkey from '@devicefarmer/adbkit-monkey';
import Logcat from '@devicefarmer/adbkit-logcat';
import Connection from './connection';
import Sync from './sync';
import Parser from './parser';
import ProcStat from './proc/stat';

import { HostTransportCommand } from './command/host';
import {
  ClearCommand,
  FrameBufferCommand,
  GetFeaturesCommand,
  GetPackagesCommand,
  GetPropertiesCommand,
  InstallCommand,
  IsInstalledCommand,
  ListReversesCommand,
  LocalCommand,
  LogcatCommand,
  LogCommand,
  MonkeyCommand,
  RebootCommand,
  RemountCommand,
  ReverseCommand,
  RootCommand,
  ScreencapCommand,
  ShellCommand,
  StartActivityCommand,
  StartServiceCommand,
  SyncCommand,
  TcpCommand,
  TcpIpCommand,
  TrackJdwpCommand,
  UninstallCommand,
  UsbCommand,
  WaitBootCompleteCommand,
} from './command/host-transport';
import {
  AttachCommand,
  DetachCommand,
  ForwardCommand,
  ForwardTcpCommand,
  GetDevicePathCommand,
  GetSerialNoCommand,
  GetStateCommand,
  KillForwardCommand,
  ListForwardsCommand,
  WaitForDeviceCommand,
} from './command/host-serial';
import d from 'debug';
import Forward from '../Forward';
import Reverse from '../Reverse';
import StartActivityOptions from '../StartActivityOptions';
import StartServiceOptions from '../StartServiceOptions';
import { Duplex, Readable } from 'stream';
import { setTimeout as delay } from 'timers/promises';
import Stats from './sync/stats';
import Entry from './sync/entry';
import PushTransfer from './sync/pushtransfer';
import PullTransfer from './sync/pulltransfer';
import { Properties } from '../Properties';
import { Features } from '../Features';
import FramebufferStreamWithMeta from '../FramebufferStreamWithMeta';
import WithToString from '../WithToString';
import JdwpTracker from './jdwptracker';
import DeviceWithPath from '../DeviceWithPath';
import Client from './client';

const debug = d('adb:client');

const NoUserOptionError = (err: Error) => err.message.indexOf('--user') !== -1;

/**
 * The client returned by `openMonkey()`: adbkit-monkey's typed `Client`.
 */
export type MonkeyClient = ReturnType<typeof Monkey.connectStream>;

export interface WaitOptions {
  /**
   * Aborts the wait. The returned promise then rejects with `signal.reason`
   * (a `TimeoutError` for `AbortSignal.timeout(ms)`) and the connection is
   * closed. Replaces calling bluebird's `.timeout()` or `.cancel()` on the
   * returned promise.
   */
  signal?: AbortSignal;
}

export interface ShellOptions {
  /**
   * Aborts the command. Before `shell()` resolves, the returned promise
   * rejects with `signal.reason` and the connection is closed. Afterwards,
   * the output stream is destroyed with `signal.reason`: it emits `'error'`
   * and then `'close'`, and closing the connection stops the command on the
   * device. An already aborted signal rejects without connecting.
   */
  signal?: AbortSignal;
}

/**
 * Connects, then runs `run` on the connection until it settles or `signal`
 * aborts. An abort rejects with `signal.reason` right away, even while
 * connecting or while the socket is stalled; the connection, which belongs
 * to this call alone, is then destroyed in the background. `connect` should
 * only open the socket: anything that talks to the server, such as selecting
 * the device's transport, belongs in `run`, so that an abort can close the
 * socket while it waits for the answer.
 */
function abortable<T>(
  signal: AbortSignal | undefined,
  connect: () => Promise<Connection>,
  run: (conn: Connection) => Promise<T>,
): Promise<T> {
  if (!signal) {
    return connect().then(run);
  }
  if (signal.aborted) {
    return Promise.reject(signal.reason);
  }
  return new Promise<T>((resolve, reject) => {
    let conn: Connection | undefined;
    const teardown = (c: Connection) => {
      // Gives up the whole connection: its pending read is released and the
      // socket closed even if the remote never answers or closes its side.
      c.parser.cancel();
      c.destroy();
    };
    const onAbort = () => {
      reject(signal.reason);
      if (conn) {
        teardown(conn);
      }
    };
    signal.addEventListener('abort', onAbort, { once: true });
    connect()
      .then((c) => {
        conn = c;
        if (signal.aborted) {
          teardown(c);
          throw signal.reason;
        }
        return run(c);
      })
      // After an abort the promise is already rejected, so settling does
      // nothing; handling both outcomes also keeps the background operation
      // from rejecting unhandled.
      .then(
        (value) => {
          signal.removeEventListener('abort', onAbort);
          resolve(value);
        },
        (err) => {
          signal.removeEventListener('abort', onAbort);
          reject(err);
        },
      );
  });
}

/**
 * Keeps `signal` in charge of a stream that outlives the call that opened
 * it: an abort destroys the stream with `signal.reason`. The listener goes
 * away as soon as the stream ends or closes, so a long-lived signal
 * doesn't collect one per call. A stream nobody reads to the end or destroys
 * keeps it, like it keeps its socket.
 */
function destroyOnAbort(signal: AbortSignal, stream: Duplex): void {
  const onAbort = () => {
    // The error is the caller's own doing, so don't let it reach the
    // Client's 'error' event, which the Connection forwards socket errors to
    // when nobody else listens. Readers listening on the stream still get it.
    stream.on('error', () => undefined);
    stream.destroy(signal.reason);
  };
  if (signal.aborted) {
    onAbort();
    return;
  }
  signal.addEventListener('abort', onAbort, { once: true });
  // Not 'finish': that only means the caller ended its side, and the command
  // can still run and send output, so the signal must still be able to stop it.
  const events = ['end', 'close'];
  const release = () => {
    signal.removeEventListener('abort', onAbort);
    for (const event of events) {
      stream.removeListener(event, release);
    }
  };
  for (const event of events) {
    stream.once(event, release);
  }
}

export default class DeviceClient {
  constructor(
    public readonly client: Client,
    public readonly serial: string,
  ) {
    // no code
  }

  /**
   * Gets the serial number of the device identified by the given serial number. With our API this doesn't really make much sense, but it has been implemented for completeness. _FYI: in the raw ADB protocol you can specify a device in other ways, too._
   *
   * @returns The serial number of the device.
   */
  public getSerialNo(): Promise<string> {
    return this.connection().then((conn) => new GetSerialNoCommand(conn).execute(this.serial));
  }

  /**
   * Gets the device path of the device identified by the given serial number.
   * @returns The device path. This corresponds to the device path in `client.listDevicesWithPaths()`.
   */
  public getDevicePath(): Promise<DeviceWithPath['path']> {
    return this.connection().then((conn) => new GetDevicePathCommand(conn).execute(this.serial));
  }
  /**
   * Gets the state of the device identified by the given serial number.
   *
   * @returns The device state. This corresponds to the device type in `client.listDevices()`.
   */
  public getState(): Promise<string> {
    return this.connection().then((conn) => new GetStateCommand(conn).execute(this.serial));
  }

  /**
   * Retrieves the properties of the device identified by the given serial number. This is analogous to `adb shell getprop`.
   *
   * @returns An object of device properties. Each key corresponds to a device property. Convenient for accessing things like `'ro.product.model'`.
   */
  public getProperties(): Promise<Properties> {
    return this.transport().then((transport) => new GetPropertiesCommand(transport).execute());
  }

  /**
   * Retrieves the features of the device identified by the given serial number. This is analogous to `adb shell pm list features`. Useful for checking whether hardware features such as NFC are available (you'd check for `'android.hardware.nfc'`).
   *
   * @returns An object of device features. Each key corresponds to a device feature, with the value being either `true` for a boolean feature, or the feature value as a string (e.g. `'0x20000'` for `reqGlEsVersion`).
   */
  public getFeatures(): Promise<Features> {
    return this.transport().then((transport) => new GetFeaturesCommand(transport).execute());
  }

  /**
   * Retrieves the list of packages present on the device. This is analogous to `adb shell pm list packages`. If you just want to see if something's installed, consider using `device.isInstalled()` instead.
   *
   * @param [flags] Flags to pass to the `pm list packages` command to filter the list
   * ```
   * -d: filter to only show disabled packages
   * -e: filter to only show enabled packages
   * -s: filter to only show system packages
   * -3: filter to only show third party packages
   * ```
   * The string is passed to the device shell as is, not escaped, so don't build it from untrusted input.
   * @returns An array of package names.
   */
  public getPackages(flags?: string): Promise<string[]> {
    return this.transport().then((transport) => new GetPackagesCommand(transport).execute(flags));
  }

  /**
   * Attemps to retrieve the IP address of the device. Roughly analogous to `adb shell getprop dhcp.<iface>.ipaddress`.
   *
   * @param [iface] The network interface. Defaults to `'wlan0'`.
   *
   * @returns The IP address as a `String`.
   */
  public getDHCPIpAddress(iface = 'wlan0'): Promise<string> {
    return this.getProperties().then((properties) => {
      const ip = properties[`dhcp.${iface}.ipaddress`];
      if (ip) {
        return ip;
      }
      throw Error(`Unable to find ipaddress for '${iface}'`);
    });
  }

  /**
   * Forwards socket connections from the ADB server host (local) to the device (remote). This is analogous to `adb forward <local> <remote>`. It's important to note that if you are connected to a remote ADB server, the forward will be created on that host.
   *
   * @param local A string representing the local endpoint on the ADB host. At time of writing, can be one of:
   * -   `tcp:<port>`
   * -   `localabstract:<unix domain socket name>`
   * -   `localreserved:<unix domain socket name>`
   * -   `localfilesystem:<unix domain socket name>`
   * -   `dev:<character device name>`
   * @param remote A string representing the remote endpoint on the device. At time of writing, can be one of:
   *   Any value accepted by the `local` argument
   *   `jdwp:<process pid>`
   * @returns true
   */
  public forward(local: string, remote: string): Promise<boolean> {
    return this.connection().then((conn) => new ForwardCommand(conn).execute(this.serial, local, remote));
  }

  /**
   * Like `forward()`, but for a `tcp:<port>` local endpoint, and resolves with the port the ADB server listens on. Use `tcp:0` to let the server pick a free port. This is analogous to `adb forward tcp:0 <remote>`, which prints the port.
   *
   * @param local `tcp:<port>`, where `<port>` may be `0`. Any other local endpoint is rejected.
   * @param remote A string representing the remote endpoint on the device. Same format as `forward()`'s `remote` argument.
   * @returns The port the forward listens on.
   */
  public forwardTcp(local: string, remote: string): Promise<number> {
    return this.connection().then((conn) => new ForwardTcpCommand(conn).execute(this.serial, local, remote));
  }

  /**
   * Removes a forward created with `forward()` or `forwardTcp()`. This is analogous to `adb forward --remove <local>`. Rejects if no forward listens on `local`.
   *
   * @param local The local endpoint of the forward, as `listForwards()` reports it. For a forward created with `tcp:0`, that is `tcp:<port>` with the port `forwardTcp()` resolved with.
   * @returns true
   */
  public removeForward(local: string): Promise<boolean> {
    return this.connection().then((conn) => new KillForwardCommand(conn).execute(this.serial, local));
  }

  /**
   * Removes all forwards of this device. This is analogous to `adb -s <serial> forward --remove-all`, except that it leaves the forwards of other devices alone: the ADB server's `killforward-all` removes the forwards of every device, whatever serial it's sent with.
   *
   * @returns true
   */
  public removeAllForwards(): Promise<boolean> {
    return this.listForwards()
      .then((forwards) => {
        const own = forwards.filter((forward) => forward.serial === this.serial);
        return own.reduce<Promise<unknown>>(
          (previous, forward) =>
            previous.then(() =>
              this.removeForward(forward.local).catch((err) => {
                // Removed by someone else since it was listed.
                if (err instanceof Parser.FailError && /not found/.test(err.message)) {
                  return;
                }
                throw err;
              }),
            ),
          Promise.resolve(),
        );
      })
      .then(() => true);
  }

  /**
   * Lists forwarded connections on the device. This is analogous to `adb forward --list`.
   *
   * @returns An array of forward objects with the following properties:
   *   -   **serial** The device serial.
   *   -   **local** The local endpoint. Same format as `client.forward()`'s `local` argument.
   *   -   **remote** The remote endpoint on the device. Same format as `client.forward()`'s `remote` argument.
   */
  public listForwards(): Promise<Forward[]> {
    return this.connection().then((conn) => new ListForwardsCommand(conn).execute(this.serial));
  }

  /**
   * Reverses socket connections from the device (remote) to the ADB server host (local). This is analogous to `adb reverse <remote> <local>`. It's important to note that if you are connected to a remote ADB server, the reverse will be created on that host.
   * @param remote A string representing the remote endpoint on the device. At time of writing, can be one of:
   * -   `tcp:<port>`
   * -   `localabstract:<unix domain socket name>`
   * -   `localreserved:<unix domain socket name>`
   * -   `localfilesystem:<unix domain socket name>`
   * @param local A string representing the local endpoint on the ADB host. At time of writing, can be any value accepted by the `remote` argument.
   */
  public reverse(remote: string, local: string): Promise<boolean> {
    return this.transport().then((transport) => new ReverseCommand(transport).execute(remote, local));
  }
  /**
   * Lists reversed connections on the device. This is analogous to `adb reverse --list`.
   *
   * @returns An array of Reverse objects with the following properties:
   *  -   **remote** The remote endpoint on the device. Same format as `client.reverse()`'s `remote` argument.
   *  -   **local** The local endpoint on the host. Same format as `client.reverse()`'s `local` argument.
   */
  public listReverses(): Promise<Reverse[]> {
    return this.transport().then((transport) => new ListReversesCommand(transport).execute());
  }

  /**
   * return a new connection to ADB.
   */
  private connection(): Promise<Connection> {
    return this.client.connection();
  }

  /**
   * return a new connextion to the current Host devices
   */
  public transport(): Promise<Connection> {
    return this.connection().then((conn) => this.selectTransport(conn).then(() => conn));
  }

  /**
   * Switches a fresh connection to this device's transport.
   */
  private selectTransport(conn: Connection): Promise<boolean> {
    return new HostTransportCommand(conn).execute(this.serial);
  }

  /**
   * Runs a shell command on the device. Note that you'll be limited to the permissions of the `shell` user, which ADB uses.
   *
   * @param command The shell command to execute. When `String`, the command is run as-is. When `Array`, the elements will be rudimentarily escaped (for convenience, not security) and joined to form a command.
   *
   * @param options Optional. `signal` aborts the command, e.g. `{ signal: AbortSignal.timeout(10000) }`. Before the promise resolves, it rejects with `signal.reason` and the connection is closed. After it resolves, the stream is destroyed with `signal.reason` (it emits `'error'`, then `'close'`), which also stops the command on the device.
   *
   * @returns A readable stream (`Socket` actually) containing the progressive `stdout` of the command. Use with `adb.util.readAll` to get a readable String from it. Read it to the end or destroy it, even when you don't need the output: until then its socket stays open (and, with a `signal`, so does the abort listener on the signal).
   */
  public shell(command: string | ArrayLike<WithToString>, options: ShellOptions = {}): Promise<Duplex> {
    const signal = options?.signal;
    return abortable(
      signal,
      () => this.connection(),
      (conn) =>
        this.selectTransport(conn)
          .then(() => new ShellCommand(conn).execute(command))
          .then((stream) => {
            if (signal) {
              destroyOnAbort(signal, stream);
            }
            return stream;
          }),
    );
  }

  /**
   * Restarts the device, or boots it into another mode such as the bootloader or recovery, like `adb reboot [target]`. The promise resolves when adbd closes the connection, which it does as the device goes down, not once the device is back online.
   *
   * @param target Optional. What to reboot into, as in `adb reboot <target>`: for example `'bootloader'`, `'recovery'`, `'sideload'` or `'fastboot'`. Passed to adbd as is, so what each target does depends on the device. Omit it for a normal reboot. If the device refuses the target (an emulator refuses `'recovery'`), adbd keeps the connection open and the returned promise doesn't settle, like `adb reboot <target>`.
   * @returns true
   */
  public reboot(target?: string): Promise<boolean> {
    return this.transport().then((transport) => new RebootCommand(transport).execute(target));
  }

  /**
   * Attempts to remount the `/system` partition in read-write mode. This will usually only work on emulators and developer devices.
   *
   * @returns true
   */
  public remount(): Promise<boolean> {
    return this.transport().then((transport) => new RemountCommand(transport).execute());
  }

  /**
   * Puts the device into root mode which may be needed by certain shell commands. A remount is generally required after a successful root call. **Note that this will only work if your device supports this feature. Production devices almost never do.**
   *
   * @return true
   */
  public root(): Promise<boolean> {
    return this.transport().then((transport) => new RootCommand(transport).execute());
  }

  /**
   * Starts a JDWP tracker for the given device.
   *
   * Note that as the tracker will keep a connection open, you must call `tracker.end()` if you wish to stop tracking JDWP processes.
   *
   * @returns The JDWP tracker, which is an [`EventEmitter`][node-events]. The following events are available:
   *  -   **add** **(pid)** Emitted when a new JDWP process becomes available, once per pid.
   *  -   **remove** **(pid)** Emitted when a JDWP process becomes unavailable, once per pid.
   *  -   **changeSet** **(changes, pids)** All changes in a single event.
   *    -   **changes** An object with the following properties always present:
   *      -   **added** An array of pids that were added. Empty if none.
   *      -   **removed** An array of pids that were removed. Empty if none.
   *    -   **pids** All currently active pids (including pids from previous runs).
   *  -   **end** Emitted when the underlying connection ends.
   *  -   **error** **(err)** Emitted if there's an error.
   */
  public trackJdwp(): Promise<JdwpTracker> {
    return this.transport().then((transport) => new TrackJdwpCommand(transport).execute());
  }

  /**
   * Fetches the current **raw** framebuffer (i.e. what is visible on the screen) from the device, and optionally converts it into something more usable by using [GraphicsMagick][graphicsmagick]'s `gm` command, which must be available in `$PATH` if conversion is desired. Note that we don't bother supporting really old framebuffer formats such as RGB_565. If for some mysterious reason you happen to run into a `>=2.3` device that uses RGB_565, let us know.
   *
   * Note that high-resolution devices can have quite massive framebuffers. For example, a device with a resolution of 1920x1080 and 32 bit colors would have a roughly 8MB (`1920*1080*4` byte) RGBA framebuffer. Empirical tests point to about 5MB/s bandwidth limit for the ADB USB connection, which means that it can take ~1.6 seconds for the raw data to arrive, or even more if the USB connection is already congested. Using a conversion will further slow down completion.
   *
   * @param format The desired output format. Any output format supported by [GraphicsMagick][graphicsmagick] (such as `'png'`) is supported. Defaults to `'raw'` for raw framebuffer data.
   *
   * @returns The possibly converted framebuffer stream. The stream also has a `meta`.:
   */
  public framebuffer(format = 'raw'): Promise<FramebufferStreamWithMeta> {
    return this.transport().then((transport) => new FrameBufferCommand(transport).execute(format));
  }

  /**
   * Takes a screenshot in PNG format using the built-in `screencap` utility. This is analogous to `adb shell screencap -p`. Sadly, the utility is not available on most Android `<=2.3` devices, but a silent fallback to the `device.framebuffer()` command in PNG mode is attempted, so you should have its dependencies installed just in case.
   *
   * Generating the PNG on the device naturally requires considerably more processing time on that side. However, as the data transferred over USB easily decreases by ~95%, and no conversion being required on the host, this method is usually several times faster than using the framebuffer. Naturally, this benefit does not apply if we're forced to fall back to the framebuffer.
   *
   * For convenience purposes, if the screencap command fails (e.g. because it doesn't exist on older Androids), we fall back to `device.framebuffer('png')`, which is slower and has additional installation requirements.
   *
   * @return The PNG stream.
   */
  public screencap(): Promise<Duplex> {
    return this.transport().then((transport) =>
      new ScreencapCommand(transport).execute().catch((err) => {
        debug(`Emulating screencap command due to '${err}'`);
        return this.framebuffer('png');
      }),
    );
  }

  /**
   * Opens a direct connection to a unix domain socket in the given path.
   *
   * @param path The path to the socket. Prefixed with `'localfilesystem:'` by default, include another prefix (e.g. `'localabstract:'`) in the path to override.
   *
   * @returns The connection (i.e. [`net.Socket`][node-net]). Read and write as you please. Call `conn.end()` to end the connection.
   */
  public openLocal(path: string): Promise<Duplex> {
    return this.transport().then((transport) => new LocalCommand(transport).execute(path));
  }

  /**
   * Opens a direct connection to a binary log file, providing access to the raw log data. Note that it is usually much more convenient to use the `client.openLogcat()` method, described separately.
   *
   * @param name The name of the log. Available logs include `'main'`, `'system'`, `'radio'` and `'events'`.
   *
   * @returns The binary log stream. Call `log.end()` when you wish to stop receiving data.
   */
  public openLog(name: string): Promise<Duplex> {
    return this.transport().then((transport) => new LogCommand(transport).execute(name));
  }

  /**
     * Opens a direct TCP connection to a port on the device, without any port forwarding required.

     * @param port The port number to connect to.
     * @param host Optional. The host to connect to. Allegedly this is supposed to establish a connection to the given host from the device, but we have not been able to get it to work at all. Skip the host and everything works great.
     *
     * @returns The TCP connection (i.e. [`net.Socket`][node-net]). Read and write as you please. Call `conn.end()` to end the connection.
     */
  public openTcp(port: number, host?: string): Promise<Duplex> {
    return this.transport().then((transport) => new TcpCommand(transport).execute(port, host));
  }

  /**
   * Starts the built-in `monkey` utility on the device, connects to it using `client.openTcp()` and hands the connection to [adbkit-monkey][adbkit-monkey], a pure Node.js Monkey client. This allows you to create touch and key events, among other things.
   *
   * For more information, check out the [adbkit-monkey][adbkit-monkey] documentation.
   *
   * @param port Optional. The device port where you'd like Monkey to run at. Defaults to `1080`.
   *
   * @returns The Monkey client. Please see the [adbkit-monkey][adbkit-monkey] documentation for details.
   */
  public openMonkey(port = 1080): Promise<MonkeyClient> {
    const tryConnect = (times: number): Promise<MonkeyClient> => {
      return this.openTcp(port)
        .then((stream) => Monkey.connectStream(stream))
        .catch((err) => {
          if ((times -= 1)) {
            debug(`Monkey can't be reached, trying ${times} more times`);
            return delay(100).then(() => tryConnect(times));
          } else {
            throw err;
          }
        });
    };
    return tryConnect(1).catch(() => {
      return this.transport()
        .then((transport) => new MonkeyCommand(transport).execute(port))
        .then((out) => tryConnect(20).then((monkey) => monkey.once('end', () => out.end())));
    });
  }

  /**
   * Calls the `logcat` utility on the device and hands off the connection to [adbkit-logcat][adbkit-logcat], a pure Node.js Logcat client. This is analogous to `adb logcat -B`, but the event stream will be parsed for you and a separate event will be emitted for every log entry, allowing for easy processing.
   *
   * For more information, check out the [adbkit-logcat][adbkit-logcat] documentation.
   *
   * @param options Optional. The following options are supported:
   * -   **clear** When `true`, clears logcat before opening the reader. Not set by default.
   *
   * @returns The Logcat client. Please see the [adbkit-logcat][adbkit-logcat] documentation for details.
   */
  public openLogcat(options: { clear?: boolean } = {}): Promise<Logcat> {
    return this.transport()
      .then((transport) => new LogcatCommand(transport).execute(options))
      .then((stream) => Logcat.readStream(stream, { fixLineFeeds: false }));
  }

  /**
   * Tracks `/proc/stat` and emits useful information, such as CPU load. A single sync service instance is used to download the `/proc/stat` file for processing. While doing this does consume some resources, it is very light and should not be a problem.
   *
   * @returns The `/proc/stat` tracker, which is an [`EventEmitter`][node-events]. Call `stat.end()` to stop tracking. The following events are available:
   *   -   **load** **(loads)** Emitted when a CPU load calculation is available.
   *   -   **loads** CPU loads of **online** CPUs. Each key is a CPU id (e.g. `'cpu0'`, `'cpu1'`) and the value an object with the following properties:
   *     -   **user** Percentage (0-100) of ticks spent on user programs.
   *     -   **nice** Percentage (0-100) of ticks spent on `nice`d user programs.
   *     -   **system** Percentage (0-100) of ticks spent on system programs.
   *     -   **idle** Percentage (0-100) of ticks spent idling.
   *     -   **iowait** Percentage (0-100) of ticks spent waiting for IO.
   *     -   **irq** Percentage (0-100) of ticks spent on hardware interrupts.
   *     -   **softirq** Percentage (0-100) of ticks spent on software interrupts.
   *     -   **steal** Percentage (0-100) of ticks stolen by others.
   *     -   **guest** Percentage (0-100) of ticks spent by a guest.
   *     -   **guestnice** Percentage (0-100) of ticks spent by a `nice`d guest.
   *     -   **total** Total. Always 100.
   */
  public openProcStat(): Promise<ProcStat> {
    return this.syncService().then((sync) => new ProcStat(sync));
  }

  /**
   * Deletes all data associated with a package from the device. This is roughly analogous to `adb shell pm clear <pkg>`.
   *
   * @param pkg The package name. This is NOT the APK.
   *
   * @returns true
   */
  public clear(pkg: string): Promise<boolean> {
    return this.transport().then((transport) => new ClearCommand(transport).execute(pkg));
  }

  /**
   * Installs the APK on the device, replacing any previously installed version. This is roughly analogous to `adb install -r <apk>`.
   *
   * Note that if the call seems to stall, you may have to accept a dialog on the phone first.
   *
   * @param apk When `String`, interpreted as a path to an APK file. When [`Stream`][node-stream], installs directly from the stream, which must be a valid APK.
   * @returns true
   */
  public install(apk: string | Readable): Promise<boolean> {
    const temp = Sync.temp(typeof apk === 'string' ? apk : '_stream.apk');
    return this.push(apk, temp).then((transfer) => {
      let endListener: () => void;
      let errorListener: (err: Error) => void;
      return new Promise<boolean>((resolve, reject) => {
        errorListener = (err: Error) => reject(err);
        endListener = () =>
          this.installRemote(temp)
            .then((value: boolean) => resolve(value))
            .catch(reject);
        transfer.on('error', errorListener);
        transfer.on('end', endListener);
      }).finally(() => {
        transfer.removeListener('error', errorListener);
        transfer.removeListener('end', endListener);
      });
    });
  }

  /**
   * Installs an APK file which must already be located on the device file system, and replaces any previously installed version. Useful if you've previously pushed the file to the device for some reason (perhaps to have direct access to `device.push()`'s transfer stats). This is roughly analogous to `adb shell pm install -r <apk>` followed by `adb shell rm -f <apk>`.
   *
   * Note that if the call seems to stall, you may have to accept a dialog on the phone first.
   *
   * @param apk The path to the APK file on the device. The file will be removed when the command completes.
   * @returns true
   */
  public installRemote(apk: string): Promise<boolean> {
    return this.transport().then((transport) => {
      return new InstallCommand(transport)
        .execute(apk)
        .finally(() => {
          return this.shell(['rm', '-f', apk]).then((stream) => new Parser(stream).readAll());
        })
        .then(() => true);
    });
  }

  /**
   * Uninstalls the package from the device. This is roughly analogous to `adb uninstall <pkg>`.
   *
   * @param pkg The package name. This is NOT the APK.
   * @returns true
   */
  public uninstall(pkg: string): Promise<boolean> {
    return this.transport().then((transport) => new UninstallCommand(transport).execute(pkg));
  }

  /**
   * Tells you if the specific package is installed or not. This is analogous to `adb shell pm path <pkg>` and some output parsing.
   *
   * @param pkg The package name. This is NOT the APK.
   *
   * @returns `true` if the package is installed, `false` otherwise.
   */
  public isInstalled(pkg: string): Promise<boolean> {
    return this.transport().then((transport) => new IsInstalledCommand(transport).execute(pkg));
  }

  /**
   * Starts the configured activity on the device. Roughly analogous to `adb shell am start <options>`.
   *
   * @param options The activity configuration.
   */
  public startActivity(options: StartActivityOptions): Promise<boolean> {
    return this.transport()
      .then((transport) => new StartActivityCommand(transport).execute(options))
      .catch((err) => {
        if (!NoUserOptionError(err)) {
          throw err;
        }
        options.user = undefined;
        return this.startActivity(options);
      });
  }

  /**
   * Starts the configured service on the device. Roughly analogous to `adb shell am startservice <options>`.
   * @param options The service configuration.
   */
  public startService(options: StartServiceOptions): Promise<boolean> {
    return this.transport()
      .then((transport) => {
        if (!(options.user || options.user === null)) {
          options.user = 0;
        }
        return new StartServiceCommand(transport).execute(options);
      })
      .catch((err) => {
        if (!NoUserOptionError(err)) {
          throw err;
        }
        // null, not undefined: undefined would make the retry add --user 0
        // again and loop forever.
        options.user = null;
        return this.startService(options);
      });
  }

  /**
   * Establishes a new Sync connection that can be used to push and pull files. This method provides the most freedom and the best performance for repeated use, but can be a bit cumbersome to use. For simple use cases, consider using `device.stat()`, `device.push()` and `device.pull()`.
   *
   * @returns The Sync client. See below for details. Call `sync.end()` when done.
   */
  public syncService(): Promise<Sync> {
    return this.transport().then((transport) => new SyncCommand(transport).execute());
  }

  /**
     * Retrieves information about the given path.
     *
     * @param path The path.
     *
     * @returns An [`fs.Stats`][node-fs-stats] instance. While the `stats.is*` methods are available, only the following properties are supported:
        -   **mode** The raw mode.
        -   **size** The file size.
        -   **mtime** The time of last modification as a `Date`.
     */
  public stat(path: string): Promise<Stats> {
    return this.syncService().then((sync) => sync.stat(path).finally(() => sync.end()));
  }

  /**
   * A convenience shortcut for `sync.readdir()`, mainly for one-off use cases. The connection cannot be reused, resulting in poorer performance over multiple calls. However, the Sync client will be closed automatically for you, so that's one less thing to worry about.
   *
   * @param path See `sync.readdir()` for details.
   * @returns Files Lists
   */
  public readdir(path: string): Promise<Entry[]> {
    return this.syncService().then((sync) => sync.readdir(path).finally(() => sync.end()));
  }

  /**
   * A convenience shortcut for `sync.pull()`, mainly for one-off use cases. The connection cannot be reused, resulting in poorer performance over multiple calls. However, the Sync client will be closed automatically for you, so that's one less thing to worry about.
   *
   * @param path See `sync.pull()` for details.
   *
   * @returns A `PullTransfer` instance.
   */
  public pull(path: string): Promise<PullTransfer> {
    // 'close' follows both 'end' and 'error'.
    return this.syncService().then((sync) => sync.pull(path).on('close', () => sync.end()));
  }

  /**
   * A convenience shortcut for `sync.push()`, mainly for one-off use cases. The connection cannot be reused, resulting in poorer performance over multiple calls. However, the Sync client will be closed automatically for you, so that's one less thing to worry about.
   *
   * @param contents See `sync.push()` for details.
   * @param path See `sync.push()` for details.
   * @param mode See `sync.push()` for details.
   */
  public push(contents: string | Readable, path: string, mode?: number): Promise<PushTransfer> {
    // 'close' follows both 'end' and 'error'.
    return this.syncService().then((sync) => sync.push(contents, path, mode).on('close', () => sync.end()));
  }

  /**
   * Puts the device's ADB daemon into tcp mode, allowing you to use `adb connect` or `client.connect()` to connect to it. Note that the device will still be visible to ADB as a regular USB-connected device until you unplug it. Same as `adb tcpip <port>`.
   *
   * @param port Optional. The port the device should listen on. Defaults to `5555`.
   * @returns The port the device started listening on.
   */
  public tcpip(port = 5555): Promise<number> {
    return this.transport().then((transport) => new TcpIpCommand(transport).execute(port));
  }

  /**
   * Puts the device's ADB daemon back into USB mode. Reverses `client.tcpip()`. Same as `adb usb`.
   *
   * @returns true
   */
  public usb(): Promise<boolean> {
    return this.transport().then((transport) => new UsbCommand(transport).execute());
  }

  /**
   * Waits until the device has finished booting. Note that the device must already be seen by ADB. This is roughly analogous to periodically checking `adb shell getprop sys.boot_completed`.
   *
   * @param options Optional. `signal` aborts the wait, e.g. `{ signal: AbortSignal.timeout(60000) }`.
   * @returns true
   */
  public waitBootComplete(options: WaitOptions = {}): Promise<boolean> {
    return abortable(
      options?.signal,
      () => this.connection(),
      (conn) => this.selectTransport(conn).then(() => new WaitBootCompleteCommand(conn).execute()),
    );
  }

  /**
   * Waits until ADB can see the device. Note that you must know the serial in advance. Other than that, works like `adb -s serial wait-for-device`. If you're planning on reacting to random devices being plugged in and out, consider using `client.trackDevices()` instead.
   *
   * @param options Optional. `signal` aborts the wait, e.g. `{ signal: AbortSignal.timeout(60000) }`.
   * @returns The device ID. Can be useful for chaining.
   */
  public waitForDevice(options: WaitOptions = {}): Promise<string> {
    return abortable(
      options?.signal,
      () => this.connection(),
      (conn) => new WaitForDeviceCommand(conn).execute(this.serial),
    );
  }

  /**
   * Reattaches ADB to the device's ADB USB interface. This re-enables communication between ADB and device, reversing `client.detach()`.
   *
   * @returns true
   */
  public attach(): Promise<boolean> {
    return this.connection().then((conn) => new AttachCommand(conn).execute(this.serial));
  }

  /**
   * Detaches ADB's USB interface from ADB. This releases the device from ADB control, allowing other processes to use it.
   *
   * @returns true
   */
  public detach(): Promise<boolean> {
    return this.connection().then((conn) => new DetachCommand(conn).execute(this.serial));
  }
}
