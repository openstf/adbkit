# stf-adb

**stf-adb** is a pure [Node.js][nodejs] client for the [Android Debug Bridge][adb-site] server. It can be used either as a library in your own application, or simply as a convenient utility for playing with your device.

Most of the `adb` command line tool's functionality is supported (including pushing/pulling files, installing APKs and processing logs), with some added functionality such as being able to generate touch/key events and take screenshots.

## Requirements

Please note that although it may happen at some point, currently **this project is NOT an implementation of the ADB _server_**. The target host (where the devices are connected) must still have ADB installed and either already running (e.g. via `adb start-server`) or available in `$PATH`. An attempt will be made to start the server locally via the aforementioned command if the initial connection fails. This is the only case where we fall back to the `adb` binary.

When targeting a remote host, starting the server is entirely your responsibility.

Alternatively, you may want to consider using the Chrome [ADB][chrome-adb] extension, as it includes the ADB server and can be started/stopped quite easily.

## Debugging

We use [debug][node-debug], and our debug namespace is `adb`. Some of the dependencies may provide debug output of their own. To see the debug output, set the `DEBUG` environment variable. For example, run your program with `DEBUG=adb:* node app.js`.

## Contributing


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
