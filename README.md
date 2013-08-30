# stf-adb

**stf-adb** is a pure [Node.js][nodejs] client for the [Android Debug Bridge][adb-site] server. It can be used either as a library in your own application, or simply as a convenient utility for playing with your device.

Most of the `adb` command line tool's functionality is supported (including pushing/pulling files, installing APKs and processing logs), with some added functionality such as being able to generate touch/key events and take screenshots.

## Requirements

Please note that although it may happen at some point, **this project is NOT an implementation of the ADB _server_**. The target host (where the devices are connected) must still have ADB installed and either already running (e.g. via `adb start-server`) or available in `$PATH`. An attempt will be made to start the server locally via the aforementioned command if the initial connection fails. This is the only case where we fall back to the `adb` binary.

When targeting a remote host, starting the server is entirely your responsibility.

Alternatively, you may want to consider using the Chrome [ADB][chrome-adb] extension, as it includes the ADB server and can be started/stopped quite easily.

## Examples

### Checking for NFC support

```js
var adb = require('stf-adb');
var client = adb.createClient();

client.listDevices(function(err, devices) {
  devices.forEach(function(device) {
    client.getFeatures(device.id, function(err, features) {
      if (features['android.hardware.nfc']) {
        console.log('Device %s supports NFC', device.id);
      }
    });
  });
});
```

### Installing an APK

```js
var adb = require('stf-adb');
var client = adb.createClient();
var apk = 'vendor/app.apk';

client.listDevices(function(err, devices) {
  devices.forEach(function(device) {
    client.install(device.id, apk, function(err) {
      if (!err) {
        console.log('Installed %s on device %s', apk, device.id);
      }
    });
  });
});
```

### Tracking devices

```js
var adb = require('stf-adb');
var client = adb.createClient();

client.trackDevices(function(err, tracker) {
  tracker.on('add', function(device) {
    console.log('Device %s was plugged in', device.id);
  });
  tracker.on('remove', function(device) {
    console.log('Device %s was unplugged', device.id);
  });
});
```

### Pulling a file from a device

```js
var fs = require('fs');
var adb = require('stf-adb');
var client = adb.createClient();

client.listDevices(function(err, devices) {
  devices.forEach(function(device) {
    client.pull(device.id, '/system/build.prop', function(err, stream) {
      stream.pipe(fs.createWriteStream(device.id + '.build.prop'));
    });
  });
});
```

## API

### ADB

#### adb.createClient([options])

Creates a client instance with the provided options. Note that this will not automatically establish a connection, it will only be done when necessary.

* **options** An object compatible with [Net.connect][net-connect]'s options:
    - **port** The port where the ADB server is listening. Defaults to `5037`.
    - **host** The host of the ADB server. Defaults to `'localhost'`.
    - **bin** As the sole exception, this option provides the path to the `adb` binary, used for starting the server locally if initial connection fails. Defaults to `'adb'`.
* Returns: The client instance.

### Client

##### client.version(callback)

Queries the ADB server for its version. This is mainly useful for backwards-compatibility purposes.

* **callback(err, version)**
    - **err** `null` when successful, `Error` otherwise.
    - **version** The version of the ADB server.
* Returns: The client instance.

#### client.listDevices(callback)

Gets the list of currently connected devices and emulators.

* **callback(err, devices)**
    - **err** `null` when successful, `Error` otherwise.
    - **devices** An array of device objects. The device objects are plain JavaScript objects with two properties: `id` and `type`.
        * **id** The ID of the device. For real devices, this is usually the USB identifier.
        * **type** The device type. Values include `'emulator'` for emulators, `'device'` for devices, and `'offline'` for offline devices. `'offline'` can occur for example during boot, in low-battery conditions or when the ADB connection has not yet been approved on the device.
* Returns: The client instance.

#### client.listDevicesWithPaths(callback)

Like `client.listDevices(callback)`, but includes the "path" of every device.

* **callback(err, devices)**
    - **err** `null` when successful, `Error` otherwise.
    - **devices** An array of device objects. The device objects are plain JavaScript objects with the following properties:
        * **id** See `client.listDevices()`.
        * **type** See `client.listDevices()`.
        * **path** The device path. This can be something like `usb:FD120000` for real devices.
* Returns: The client instance.

#### client.trackDevices(callback)

Gets a device tracker. Events will be emitted when devices are added, removed, or their type changes (i.e. to/from `offline`). Note that the same events will be emitted for the initially connected devices also, so that you don't need to use both `client.listDevices()` and `client.trackDevices()`.

Note that as the tracker will keep a connection open, you must call `tracker.end()` if you wish to stop tracking devices.

* **callback(err, tracker)**
    - **err** `null` when successful, `Error` otherwise.
    - **tracker** The device tracker, which is an [`EventEmitter`][node-events]. The following events are available:
        * **add_(device)_** Emitted when a new device is connected, once per device. See `client.listDevices()` for details on the device object.
        * **remove_(device)_** Emitted when a device is unplugged, once per device. This does not include `offline` devices, those devices are connected but unavailable to ADB. See `client.listDevices()` for details on the device object.
        * **change_(device)_** Emitted when the `type` property of a device changes, once per device. The current value of `type` is the new value. This event usually occurs the type changes from `'device'` to `'offline'` or the other way around. See `client.listDevices()` for details on the device object and the `'offline'` type.
        * **changeSet_(changes)_** Emitted once for all changes reported by ADB in a single run. Multiple changes can occur when, for example, a USB hub is connected/unplugged and the device list changes quickly. If you wish to process all changes at once, use this event instead of the once-per-device ones. Keep in mind that the other events will still be emitted, though.
            - **changes** An object with the following properties always present:
                * **added** An array of added device objects, each one as in the `add` event. Empty if none.
                * **removed** An array of removed device objects, each one as in the `remove` event. Empty if none.
                * **changed** An array of changed device objects, each one as in the `change` event. Empty if none.
* Returns: The client instance.

#### client.kill(callback)

This kills the ADB server. Note that the next connection will attempt to start the server again when it's unable to connect.

* **callback(err)**
    - **err** `null` when successful, `Error` otherwise.
* Returns: The client instance.

#### client.getSerialNo(serial, callback)

Gets the serial number of the device identified by the given serial number. With our API this doesn't really make much sense, but it has been implemented for completeness. _FYI: in the raw ADB protocol you can specify a device in other ways, too._

* **serial** The serial number of the device. Corresponds to the device ID in `client.listDevices()`.
* **callback(err, serial)**
    - **err** `null` when successful, `Error` otherwise.
    - **serial** The serial number of the device.
* Returns: The client instance.

#### client.getDevicePath(serial, callback)

Gets the device path of the device identified by the given serial number.

* **serial** The serial number of the device. Corresponds to the device ID in `client.listDevices()`.
* **callback(err, path)**
    - **err** `null` when successful, `Error` otherwise.
    - **path** The device path. This corresponds to the device path in `client.listDevicesWithPaths()`.
* Returns: The client instance.

#### client.getState(serial, callback)

Gets the state of the device identified by the given serial number.

* **serial** The serial number of the device. Corresponds to the device ID in `client.listDevices()`.
* **callback(err, state)**
    - **err** `null` when successful, `Error` otherwise.
    - **state** The device state. This corresponds to the device type in `client.listDevices()`.
* Returns: The client instance.

#### client.getProperties(serial, callback)

Retrieves the properties of the device identified by the given serial number. This is analogous to `adb shell getprop`.

* **serial** The serial number of the device. Corresponds to the device ID in `client.listDevices()`.
* **callback(err, properties)**
    - **err** `null` when successful, `Error` otherwise.
    - **properties** An object of device properties. Each key corresponds to a device property. Convenient for accessing things like `'ro.product.model'`.
* Returns: The client instance.

#### client.getFeatures(serial, callback)

Retrieves the features of the device identified by the given serial number. This is analogous to `adb shell pm list features`. Useful for checking whether hardware features such as NFC are available (you'd check for `'android.hardware.nfc'`).

* **serial** The serial number of the device. Corresponds to the device ID in `client.listDevices()`.
* **callback(err, features)**
    - **err** `null` when successful, `Error` otherwise.
    - **features** An object of device features. Each key corresponds to a device feature, with the value being either `true` for a boolean feature, or the feature value as a string (e.g. `'0x20000'` for `reqGlEsVersion`).
* Returns: The client instance.

#### client.forward(serial, local, remote, callback)

Forwards socket connections from the ADB server host (local) to the device (remote). This is analogous to `adb forward <local> <remote>`. It's important to note that if you are connected to a remote ADB server, the forward will be created on that host.

* **serial** The serial number of the device. Corresponds to the device ID in `client.listDevices()`.
* **local** A string representing the local endpoint on the ADB host. At time of writing, can be one of:
    - `tcp:<port>`
    - `localabstract:<unix domain socket name>`
    - `localreserved:<unix domain socket name>`
    - `localfilesystem:<unix domain socket name>`
    - `dev:<character device name>`
* **remote** A string representing the remote endpoint on the device. At time of writing, can be one of:
    - Any value accepted by the `local` argument
    - `jdwp:<process pid>`
* **callback(err)**
    - **err** `null` when successful, `Error` otherwise.
* Returns: The client instance.

#### client.shell(serial, command, callback)

Runs a shell command on the device. Note that you'll be limited to the permissions of the `shell` user, which ADB uses.

* **serial** The serial number of the device. Corresponds to the device ID in `client.listDevices()`.
* **command** The shell command to execute.
* **callback(err, output)**
    - **err** `null` when successful, `Error` otherwise.
    - **output** An output [`Stream`][node-stream] in non-flowing mode. Unfortunately it is not possible to separate stdout and stderr, you'll get both of them in one stream. It is also not possible to access the exit code of the command. If access to any of these individual properties is needed, the command must be constructed in a way that allows you to parse the information from the output.
* Returns: The client instance.

#### client.remount(serial, callback)

Attempts to remount the `/system` partition in read-write mode. This will usually only work on emulators and developer devices.

* **serial** The serial number of the device. Corresponds to the device ID in `client.listDevices()`.
* **callback(err)**
    - **err** `null` when successful, `Error` otherwise.
* Returns: The client instance.

#### client.framebuffer(serial, callback)

Fetches the current framebuffer (i.e. what is visible on the screen) from the device and converts it into PNG using [gm][node-gm], which requires either [GraphicsMagick][graphicsmagick] or [ImageMagick][imagemagick] to be installed and available in `$PATH`. Note that we don't bother supporting really old framebuffer formats such as RGB_565. If for some mysterious reason you happen to run into a `>=2.3` device that uses RGB_565, let us know.

Note that high-resolution devices can have quite massive framebuffers. For example, a device with a resolution of 1920x1080 and 32 bit colors would have a roughly 8MB (`1920*1080*4` byte) RGBA framebuffer. Empirical tests point to about 5MB/s bandwidth limit for the ADB USB connection, which means that even excluding all other processing such as the PNG conversion, it can take ~1.6 seconds for the raw data to arrive, or even more if the USB connection is already congested.

* **serial** The serial number of the device. Corresponds to the device ID in `client.listDevices()`.
* **callback(err, info, png, raw)**
    - **err** `null` when successful, `Error` otherwise.
    - **info** Meta information about the framebuffer. Includes the following properties:
        * **version** The framebuffer version. Useful for patching possible backwards-compatibility issues.
        * **bpp** Bits per pixel (i.e. color depth).
        * **size** The raw byte size of the framebuffer.
        * **width** The horizontal resolution of the framebuffer. This SHOULD always be the same as screen width. We have not encountered any device with incorrect framebuffer metadata, but according to rumors there might be some.
        * **height** The vertical resolution of the framebuffer. This SHOULD always be the same as screen height.
        * **red_offset** The bit offset of the red color in a pixel.
        * **red_length** The bit length of the red color in a pixel.
        * **blue_offset** The bit offset of the blue color in a pixel.
        * **blue_length** The bit length of the blue color in a pixel.
        * **green_offset** The bit offset of the green color in a pixel.
        * **green_length** The bit length of the green color in a pixel.
        * **alpha_offset** The bit offset of alpha in a pixel.
        * **alpha_length** The bit length of alpha in a pixel. `0` when not available.
        * **format** The framebuffer format for convenience. This can be one of `'bgr'`,  `'bgra'`, `'rgb'`, `'rgba'`.
    - **png** The converted PNG stream.
    - **raw** The raw framebuffer stream.
* Returns: The client instance.

#### client.screencap(serial, callback)

Takes a screenshot in PNG format using the built-in `screencap` utility. This is analogous to `adb shell screencap -p`. Sadly, the utility is not available on most Android `<=2.3` devices, and the current implementation does not provide a shim for older devices.

Generating the PNG on the device naturally requires considerably more processing time on that side. However, as the data transferred over USB easily decreases by ~95%, and no conversion being required on the host, this method is usually several times faster than using the framebuffer.

* **serial** The serial number of the device. Corresponds to the device ID in `client.listDevices()`.
* **callback(err, screencap)**
    - **err** `null` when successful, `Error` otherwise.
    - **screencap** The PNG stream.
* Returns: The client instance.

#### client.openLog(serial, name, callback)

Opens a direct connection to a binary log file, providing access to the raw log data. Note that it is usually much more convenient to use the `client.openLogcat()` method, described separately.

* **serial** The serial number of the device. Corresponds to the device ID in `client.listDevices()`.
* **name** The name of the log. Available logs include `'main'`, `'system'`, `'radio'` and `'events'`.
* **callback(err, log)**
    - **err** `null` when successful, `Error` otherwise.
    - **log** The binary log stream. Call `log.end()` when you wish to stop receiving data.
* Returns: The client instance.

#### client.openTcp(serial, port[, host], callback)

Opens a direct TCP connection to a port on the device, without any port forwarding required.

* **serial** The serial number of the device. Corresponds to the device ID in `client.listDevices()`.
* **port** The port number to connect to.
* **host** Optional. The host to connect to. Allegedly this is supposed to establish a connection to the given host from the device, but we have not been able to get it to work at all. Skip the host and everything works great.
* **callback(err, conn)**
    - **err** `null` when successful, `Error` otherwise.
    - **conn** The TCP connection (i.e. [`net.Socket`][node-net]). Read and write as you please. Call `conn.end()` to end the connection.
* Returns: The client instance.

#### client.openMonkey(serial[, port], callback)

Starts the built-in `monkey` utility on the device, connects to it using `client.openTcp()` and hands the connection to **stf-monkey**, a pure Node.js Monkey client. This allows you to create touch and key events, among other things.

For more information, check out the stf-monkey documentation.

* **serial** The serial number of the device. Corresponds to the device ID in `client.listDevices()`.
* **port** Optional. The device port where you'd like Monkey to run at. Defaults to `1080`.
* **callback(err, monkey)**
    - **err** `null` when successful, `Error` otherwise.
    - **monkey** The Monkey client. Please see the stf-monkey documentation for details.
* Returns: The client instance.

#### client.openLogcat(serial, callback)

Calls the `logcat` utility on the device and hands off the connection to **stf-logcat**, a pure Node.js Logcat client. This is analogous to `adb logcat -B`, but the event stream will be parsed for you and a separate event will be emitted for every log entry, allowing for easy processing.

For more information, check out the stf-logcat documentation.

* **serial** The serial number of the device. Corresponds to the device ID in `client.listDevices()`.
* **callback(err, logcat)**
    - **err** `null` when successful, `Error` otherwise.
    - **logcat** The Logcat client. Please see the stf-logcat documentation for details.
* Returns: The client instance.

#### client.install(serial, apk, callback)

Installs the APK on the device, replacing any previously installed version. This is roughly analogous to `adb install -r <apk>`.

* **serial** The serial number of the device. Corresponds to the device ID in `client.listDevices()`.
* **apk** The path to the APK file.
* **callback(err)**
    - **err** `null` when successful, `Error` otherwise.
* Returns: The client instance.

#### client.uninstall(serial, pkg, callback)

Uninstalls the package from the device. This is roughly analogous to `adb uninstall <pkg>`.

* **serial** The serial number of the device. Corresponds to the device ID in `client.listDevices()`.
* **pkg** The package name. This is NOT the APK.
* **callback(err)**
    - **err** `null` when successful, `Error` otherwise.
* Returns: The client instance.

#### client.isInstalled(serial, pkg, callback)

Uninstalls the package from the device. This is analogous to `adb shell pm path <pkg>` and some output parsing.

* **serial** The serial number of the device. Corresponds to the device ID in `client.listDevices()`.
* **pkg** The package name. This is NOT the APK.
* **callback(err, installed)**
    - **err** `null` when successful, `Error` otherwise.
    - **installed** `true` if the package is installed, `false` otherwise.
* Returns: The client instance.

#### client.startActivity(serial, options, callback)

Starts the configured activity on the device. Roughly analogous to `adb shell am start <options>`.

* **serial** The serial number of the device. Corresponds to the device ID in `client.listDevices()`.
* **options** The activity configuration. The following options are available:
    - **action** The action.
    - **component** The component.
* **callback(err)**
    - **err** `null` when successful, `Error` otherwise.
* Returns: The client instance.

#### client.syncService(serial, callback)

Establishes a new Sync connection that can be used to push and pull files. This method provides the most freedom and the best performance for repeated use, but can be a bit cumbersome to use. For simple use cases, consider using `client.stat()`, `client.push()` and `client.pull()`.

* **serial** The serial number of the device. Corresponds to the device ID in `client.listDevices()`.
* **callback(err, sync)**
    - **err** `null` when successful, `Error` otherwise.
    - **sync** The Sync client. See below for details. Call `sync.end()` when done.
* Returns: The client instance.

#### client.stat(serial, path, callback)

A convenience shortcut for `sync.stat()`, mainly for one-off use cases. The connection cannot be reused, resulting in poorer performance over multiple calls. However, the Sync client will be closed automatically for you, so that's one less thing to worry about.

* **serial** The serial number of the device. Corresponds to the device ID in `client.listDevices()`.
* **path** See `sync.stat()` for details.
* **callback(err, stats)** See `sync.stat()` for details.
* Returns: The client instance.

#### client.push(serial, path, contents[, mode], callback)

A convenience shortcut for `sync.push()`, mainly for one-off use cases. The connection cannot be reused, resulting in poorer performance over multiple calls. However, the Sync client will be closed automatically for you, so that's one less thing to worry about.

* **serial** The serial number of the device. Corresponds to the device ID in `client.listDevices()`.
* **path** See `sync.push()` for details.
* **contents** See `sync.push()` for details.
* **mode** See `sync.push()` for details.
* **callback(err)** See `sync.push()` for details.
* Returns: The client instance.

#### client.pull(serial, path, callback)

A convenience shortcut for `sync.pull()`, mainly for one-off use cases. The connection cannot be reused, resulting in poorer performance over multiple calls. However, the Sync client will be closed automatically for you, so that's one less thing to worry about.

* **serial** The serial number of the device. Corresponds to the device ID in `client.listDevices()`.
* **path** See `sync.pull()` for details.
* **callback(err, stream)** See `sync.pull()` for details.
* Returns: The client instance.

### Sync

#### sync.stat(path, callback)

Retrieves information about the given path.

* **path** The path.
* **callback(err, stats)**
    - **err** `null` when successful, `Error` otherwise.
    - **stats** An [`fs.Stats`][node-fs-stats] instance. While the `stats.is*` methods are available, only the following properties are supported:
        * **mode** The raw mode.
        * **size** The file size.
        * **mtime** The time of last modification as a `Date`.
* Returns: The sync instance.

#### sync.push(path, contents[, mode], callback)

Attempts to identify `contents` and calls the appropriate `push*` method for it.

* **path** The path to push to.
* **contents** When `String`, treated as a local file path and forwarded to `sync.pushFile()`. Otherwise, treated as a [`Stream`][node-stream] and forwarded to `sync.pushStream()`.
* **mode** Optional. The mode of the file. Defaults to `0644`.
* **callback(err)**
    - **err** `null` when successful, `Error` otherwise.
* Returns: The sync instance.

#### sync.pushFile(path, file[, mode], callback)

Pushes a local file to the given path. Note that the path must be writable by the ADB user (usually `shell`). When in doubt, use `/data/local/tmp`.

* **path** The path to push to.
* **file** The local file path.
* **mode** Optional. The mode of the file. Defaults to `0644`.
* **callback(err)**
    - **err** `null` when successful, `Error` otherwise.
* Returns: The sync instance.

#### sync.pushStream(path, stream[, mode], callback)

Pushes a [`Stream`][node-stream] to the given path. Note that the path must be writable by the ADB user (usually `shell`). When in doubt, use `'/data/local/tmp'` with an appropriate filename.

* **path** The path to push to.
* **stream** The readable stream.
* **mode** Optional. The mode of the file. Defaults to `0644`.
* **callback(err)**
    - **err** `null` when successful, `Error` otherwise.
* Returns: The sync instance.

#### sync.pull(path, callback)

Pulls a file from the device as a [`Stream`][node-stream].

* **path** The path to push to.
* **callback(err, stream)**
    - **err** `null` when successful, `Error` otherwise.
    - **stream** The file [`Stream`][node-stream]. Use [`fs.createWriteStream()`][node-fs] to pipe the stream to a file if necessary.
* Returns: The sync instance.

#### sync.tempFile(path)

A simple helper method for creating appropriate temporary filenames for pushing files. This is essentially the same as taking the basename of the file and appending it to `'/data/local/tmp/'`.

* **path** The path of the file.
* Returns: An appropriate temporary file path.

#### sync.end()

Closes the Sync connection, allowing Node to quit (assuming nothing else is keeping it alive, of course).

* Returns: The sync instance.

## Debugging

We use [debug][node-debug], and our debug namespace is `adb`. Some of the dependencies may provide debug output of their own. To see the debug output, set the `DEBUG` environment variable. For example, run your program with `DEBUG=adb:* node app.js`.

## Links

* [Android Debug Bridge][adb-site]
    - [SERVICES.TXT][adb-services] (ADB socket protocol)
* [Android ADB Protocols][adb-protocols] (a blog post explaining the protocol)
* [adb.js][adb-js] (another Node.js ADB implementation)
* [ADB Chrome extension][chrome-adb]

## License

Restricted until further notice.

[nodejs]: <http://nodejs.org/>
[adb-js]: <https://github.com/flier/adb.js>
[adb-site]: <http://developer.android.com/tools/help/adb.html>
[adb-services]: <https://github.com/android/platform_system_core/blob/master/adb/SERVICES.TXT>
[adb-protocols]: <http://blogs.kgsoft.co.uk/2013_03_15_prg.htm>
[file_sync_service.h]: <https://github.com/android/platform_system_core/blob/master/adb/file_sync_service.h>
[chrome-adb]: <https://chrome.google.com/webstore/detail/adb/dpngiggdglpdnjdoaefidgiigpemgage>
[node-debug]: <https://npmjs.org/package/debug>
[net-connect]: <http://nodejs.org/api/net.html#net_net_connect_options_connectionlistener>
[node-events]: <http://nodejs.org/api/events.html>
[node-stream]: <http://nodejs.org/api/stream.html>
[node-net]: <http://nodejs.org/api/net.html>
[node-fs]: <http://nodejs.org/api/fs.html>
[node-fs-stats]: <http://nodejs.org/api/fs.html#fs_class_fs_stats>
[node-gm]: <https://github.com/aheckmann/gm>
[graphicsmagick]: <http://www.graphicsmagick.org/>
[imagemagick]: <http://www.imagemagick.org/>
