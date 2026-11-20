/**
 * Flags for `pm install`, as taken by `install()` and `installRemote()`. Every flag is off unless you set it, except `reinstall`.
 */
export default interface InstallOptions {
  /**
   * Passes `-r` to replace an already installed version of the app, keeping its data. Defaults to `true`, as before these options existed. Set it to `false` to leave `-r` out. Newer Android versions, such as Android 16, replace the app even without `-r`.
   */
  reinstall?: boolean;
  /**
   * Set to `true` to pass `-d`, which allows installing a lower version code than the installed one. Depending on the Android version and build, the device may only allow this for debuggable apps.
   */
  allowDowngrade?: boolean;
  /**
   * Set to `true` to pass `-g`, which grants all the runtime permissions the app's manifest asks for. Android 6.0 (API level 23) and newer.
   */
  grantPermissions?: boolean;
  /**
   * Set to `true` to pass `-t`, which allows installing an apk marked `android:testOnly`, such as one Android Studio builds for a run.
   */
  allowTestPackages?: boolean;
  /**
   * More arguments for `pm install`, such as `['--user', '10']`. They come after the flags above and before the apk. Each one is single-quoted, so the shell passes it on unchanged as one argument, and none of them can run another shell command.
   */
  args?: string[];
}
