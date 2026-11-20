// The classes are imported first and then exported, instead of re-exported
// with `export { default as X } from`. TypeScript compiles that form to
// getters that Node's CommonJS named-export detection (cjs-module-lexer)
// doesn't recognize on Node 22, so `import { Adb } from '@devicefarmer/adbkit'`
// failed there with "Named export 'Adb' not found".
import Adb from './src/adb';
import Parser from './src/adb/parser';
import Client from './src/adb/client';
import DeviceClient from './src/adb/DeviceClient';
import ShellCommand from './src/adb/command/host-transport/shell';

export default Adb;
export { Adb, Parser, Client, DeviceClient, ShellCommand };
export { Callback } from './src/Callback';
export { ClientOptions } from './src/ClientOptions';
export { CpuStats, Loads } from './src/CpuStats';
export { default as Device } from './src/Device';
export { default as DeviceWithPath } from './src/DeviceWithPath';
export { default as ExtendedPublicKey } from './src/ExtendedPublicKey';
export { Features } from './src/Features';
export { default as Forward } from './src/Forward';
export { default as FramebufferMeta } from './src/FramebufferMeta';
export { default as FramebufferStreamWithMeta } from './src/FramebufferStreamWithMeta';
export { Properties } from './src/Properties';
export { default as Reverse } from './src/Reverse';
export { default as SocketOptions } from './src/SocketOptions';
export { default as StartActivityOptions } from './src/StartActivityOptions';
export { default as StartServiceOptions, ExtraValue, ExtraObject, Extra } from './src/StartServiceOptions';
export { default as TrackerChangeSet } from './src/TrackerChangeSet';
export { default as WithToString } from './src/WithToString';

export { MonkeyClient, ShellOptions, WaitOptions } from './src/adb/DeviceClient';

export { KeyCodes } from './src/adb/keycode';
