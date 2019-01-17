import Monkey from 'adbkit-monkey';
import Logcat from 'adbkit-logcat';
import debugFunc from 'debug';
const debug = debugFunc('adb:client');

import Connection from './connection';
import Sync from './sync';
import Parser from './parser';
import ProcStat from './proc/stat';

import HostVersionCommand from './command/host/version';
import HostConnectCommand from './command/host/connect';
import HostDevicesCommand from './command/host/devices';
import HostDevicesWithPathsCommand from './command/host/deviceswithpaths';
import HostDisconnectCommand from './command/host/disconnect';
import HostTrackDevicesCommand from './command/host/trackdevices';
import HostKillCommand from './command/host/kill';
import HostTransportCommand from './command/host/transport';

import ClearCommand from './command/host-transport/clear';
import FrameBufferCommand, {
    Format,
} from './command/host-transport/framebuffer';
import GetFeaturesCommand from './command/host-transport/getfeatures';
import GetPackagesCommand from './command/host-transport/getpackages';
import GetPropertiesCommand from './command/host-transport/getproperties';
import InstallCommand from './command/host-transport/install';
import IsInstalledCommand from './command/host-transport/isinstalled';
import ListReversesCommand from './command/host-transport/listreverses';
import LocalCommand from './command/host-transport/local';
import LogcatCommand from './command/host-transport/logcat';
import LogCommand from './command/host-transport/log';
import MonkeyCommand from './command/host-transport/monkey';
import RebootCommand from './command/host-transport/reboot';
import RemountCommand from './command/host-transport/remount';
import RootCommand from './command/host-transport/root';
import ReverseCommand from './command/host-transport/reverse';
import ScreencapCommand from './command/host-transport/screencap';
import ShellCommand from './command/host-transport/shell';
import StartActivityCommand, {
    StartActivityOptions,
} from './command/host-transport/startactivity';
import StartServiceCommand from './command/host-transport/startservice';
import SyncCommand from './command/host-transport/sync';
import TcpCommand from './command/host-transport/tcp';
import TcpIpCommand from './command/host-transport/tcpip';
import TrackJdwpCommand from './command/host-transport/trackjdwp';
import UninstallCommand from './command/host-transport/uninstall';
import UsbCommand from './command/host-transport/usb';
import WaitBootCompleteCommand from './command/host-transport/waitbootcomplete';

import ForwardCommand from './command/host-serial/forward';
import GetDevicePathCommand from './command/host-serial/getdevicepath';
import GetSerialNoCommand from './command/host-serial/getserialno';
import GetStateCommand from './command/host-serial/getstate';
import ListForwardsCommand from './command/host-serial/listforwards';
import WaitForDeviceCommand from './command/host-serial/waitfordevice';

import TcpUsbServer from './tcpusb/server';
import { SocketOptions } from './tcpusb/socket';
import { Readable } from 'stream';

let NoUserOptionError = (err: Error) => err.message.indexOf('--user') !== -1;

type Serial = string;

export interface ClientOptions {
    host: string;
    port: number;
    bin: string;
}

async function delay(ms: number) {
    return new Promise<void>(resolve => setTimeout(resolve, ms));
}

export default class Client {
    options: ClientOptions;

    constructor(options: Partial<ClientOptions> = {}) {
        this.options = options as ClientOptions;
        if (!this.options.port) {
            this.options.port = 5037;
        }
        if (!this.options.bin) {
            this.options.bin = 'adb';
        }
    }

    createTcpUsbBridge(serial: Serial, options: SocketOptions) {
        return new TcpUsbServer(this, serial, options);
    }

    async connection() {
        let connectListener: () => void;
        let errorListener: (err: any) => void;
        let conn: Connection;

        await new Promise((resolve, reject) => {
            connectListener = resolve;
            errorListener = err => reject(err);

            conn = new Connection(this.options)
                .on('error', errorListener)
                .on('connect', connectListener)
                .connect();
        });

        conn!.removeListener('error', errorListener!);
        return conn!.removeListener('connect', connectListener!);
    }

    async version() {
        const conn = await this.connection();
        return new HostVersionCommand(conn).execute();
    }

    async connect(host: string, port: string | number = 5555) {
        if (host.includes(':')) {
            [host, port] = Array.from(host.split(':', 2));
        }
        const conn = await this.connection();
        return new HostConnectCommand(conn).execute(host, port);
    }

    async disconnect(host: string, port: string | number = 5555) {
        if (host.includes(':')) {
            [host, port] = Array.from(host.split(':', 2));
        }
        const conn = await this.connection();
        return new HostDisconnectCommand(conn).execute(host, port);
    }

    async listDevices() {
        const conn = await this.connection();
        return new HostDevicesCommand(conn).execute();
    }

    async listDevicesWithPaths() {
        const conn = await this.connection();
        return new HostDevicesWithPathsCommand(conn).execute();
    }

    async trackDevices() {
        const conn = await this.connection();
        return new HostTrackDevicesCommand(conn).execute();
    }

    async kill() {
        const conn = await this.connection();
        return new HostKillCommand(conn).execute();
    }

    async getSerialNo(serial: Serial) {
        const conn = await this.connection();
        return new GetSerialNoCommand(conn).execute(serial);
    }

    async getDevicePath(serial: Serial) {
        const conn = await this.connection();
        return new GetDevicePathCommand(conn).execute(serial);
    }

    async getState(serial: Serial) {
        const conn = await this.connection();
        return new GetStateCommand(conn).execute(serial);
    }

    async getProperties(serial: Serial) {
        const transport = await this.transport(serial);
        return new GetPropertiesCommand(transport).execute();
    }

    async getFeatures(serial: Serial) {
        const transport = await this.transport(serial);
        return new GetFeaturesCommand(transport).execute();
    }

    async getPackages(serial: Serial) {
        const transport = await this.transport(serial);
        return new GetPackagesCommand(transport).execute();
    }

    async getDHCPIpAddress(serial: Serial, iface = 'wlan0') {
        const properties = await this.getProperties(serial);
        const ip = properties![`dhcp.${iface}.ipaddress`];
        if (ip) {
            return ip;
        }
        throw new Error(`Unable to find ipaddress for '${iface}'`);
    }

    async forward(serial: Serial, local: string, remote: string) {
        const conn = await this.connection();
        return new ForwardCommand(conn).execute(serial, local, remote);
    }

    async listForwards(serial: Serial) {
        const conn = await this.connection();
        return new ListForwardsCommand(conn).execute(serial);
    }

    async reverse(serial: Serial, remote: string, local: string) {
        const transport = await this.transport(serial);
        return new ReverseCommand(transport).execute(remote, local);
    }

    async listReverses(serial: Serial) {
        const transport = await this.transport(serial);
        return new ListReversesCommand(transport).execute();
    }

    async transport(serial: Serial) {
        const conn = await this.connection();
        await new HostTransportCommand(conn).execute(serial);
        return conn;
    }

    async shell(serial: Serial, command: string | string[]) {
        const transport = await this.transport(serial);
        return new ShellCommand(transport).execute(command);
    }

    async reboot(serial: Serial) {
        const transport = await this.transport(serial);
        return new RebootCommand(transport).execute();
    }

    async remount(serial: Serial) {
        const transport = await this.transport(serial);
        return new RemountCommand(transport).execute();
    }

    async root(serial: Serial) {
        const transport = await this.transport(serial);
        return new RootCommand(transport).execute();
    }

    async trackJdwp(serial: Serial) {
        const transport = await this.transport(serial);
        return new TrackJdwpCommand(transport).execute();
    }

    async framebuffer(serial: Serial, format: Format = 'raw') {
        const transport = await this.transport(serial);
        return new FrameBufferCommand(transport).execute(format);
    }

    async screencap(serial: Serial) {
        const transport = await this.transport(serial);
        try {
            return new ScreencapCommand(transport).execute();
        } catch (err) {
            debug(`Emulating screencap command due to '${err}'`);
            return this.framebuffer(serial, 'png');
        }
    }

    async openLocal(serial: Serial, path: string) {
        const transport = await this.transport(serial);
        return new LocalCommand(transport).execute(path);
    }

    async openLog(
        serial: Serial,
        name: 'main' | 'system' | 'radio' | 'events',
    ) {
        const transport = await this.transport(serial);
        return new LogCommand(transport).execute(name);
    }

    async openTcp(serial: Serial, port: string | number, host?: string) {
        const transport = await this.transport(serial);
        return new TcpCommand(transport).execute(port, host);
    }

    async openMonkey(serial: Serial, port = 1080) {
        const tryConnect = async (times: number): Promise<Monkey.Client> => {
            try {
                const stream = await this.openTcp(serial, port);
                return Monkey.connectStream(stream!);
            } catch (err) {
                if ((times -= 1)) {
                    debug(
                        `Monkey can't be reached, trying ${times} more times`,
                    );
                    await delay(100);
                    return tryConnect(times);
                } else {
                    throw err;
                }
            }
        };

        try {
            return await tryConnect(1);
        } catch (err) {
            const transport = await this.transport(serial);
            const out = await new MonkeyCommand(transport).execute(port);
            const monkey = await tryConnect(20);
            return monkey.once('end', () => out!.end());
        }
    }

    async openLogcat(serial: Serial, options = {}) {
        const transport = await this.transport(serial);
        const stream = await new LogcatCommand(transport).execute(options);
        return Logcat.readStream(stream!, {
            fixLineFeeds: false,
        });
    }

    async openProcStat(serial: Serial) {
        const sync = await this.syncService(serial);
        return new ProcStat(sync!);
    }

    async clear(serial: Serial, pkg: string) {
        const transport = await this.transport(serial);
        return new ClearCommand(transport).execute(pkg);
    }

    async install(serial: Serial, apk: string) {
        const temp = Sync.temp(typeof apk === 'string' ? apk : '_stream.apk');
        const transfer = await this.push(serial, apk, temp);

        let endListener: () => void;
        let errorListener: (err: any) => void;

        await new Promise((resolve, reject) => {
            errorListener = err => reject(err);
            endListener = () => resolve(this.installRemote(serial, temp));
            transfer.on('error', errorListener);
            transfer.on('end', endListener);
        });

        transfer.removeListener('error', errorListener!);
        return transfer.removeListener('end', endListener!);
    }

    async installRemote(serial: Serial, apk: string) {
        const transport = await this.transport(serial);
        await new InstallCommand(transport).execute(apk);
        const stream = await this.shell(serial, ['rm', '-f', apk]);
        const out = await new Parser(stream!).readAll();
        return true;
    }

    async uninstall(serial: Serial, pkg: string) {
        const transport = await this.transport(serial);
        return new UninstallCommand(transport).execute(pkg);
    }

    async isInstalled(serial: Serial, pkg: string) {
        const transport = await this.transport(serial);
        return new IsInstalledCommand(transport).execute(pkg);
    }

    async startActivity(
        serial: Serial,
        options: StartActivityOptions,
    ): Promise<boolean | undefined> {
        try {
            const transport = await this.transport(serial);
            return new StartActivityCommand(transport).execute(options);
        } catch (err) {
            if (NoUserOptionError(err)) {
                options.user = null;
                return this.startActivity(serial, options);
            } else {
                throw err;
            }
        }
    }

    async startService(
        serial: Serial,
        options: StartActivityOptions,
    ): Promise<boolean | undefined> {
        try {
            const transport = await this.transport(serial);
            if (!options.user && options.user !== null) {
                options.user = 0;
            }
            return await new StartServiceCommand(transport).execute(options);
        } catch (err) {
            if (NoUserOptionError(err)) {
                options.user = null;
                return this.startService(serial, options);
            } else {
                throw err;
            }
        }
    }

    async syncService(serial: Serial) {
        const transport = await this.transport(serial);
        return new SyncCommand(transport).execute();
    }

    async stat(serial: Serial, path: string) {
        const sync = await this.syncService(serial);
        try {
            return sync!.stat(path);
        } finally {
            sync!.end();
        }
    }

    async readdir(serial: Serial, path: string) {
        const sync = await this.syncService(serial);
        try {
            return sync!.readdir(path);
        } finally {
            sync!.end();
        }
    }

    async pull(serial: Serial, path: string) {
        const sync = await this.syncService(serial);
        return sync!.pull(path).on('end', () => sync!.end());
    }

    async push(
        serial: Serial,
        contents: string | Readable,
        path: string,
        mode?: number,
    ) {
        const sync = await this.syncService(serial);
        return (await sync!.push(contents, path, mode)).on('end', () =>
            sync!.end(),
        );
    }

    async tcpip(serial: Serial, port = 5555) {
        const transport = await this.transport(serial);
        return new TcpIpCommand(transport).execute(port);
    }

    async usb(serial: Serial) {
        const transport = await this.transport(serial);
        return new UsbCommand(transport).execute();
    }

    async waitBootComplete(serial: Serial) {
        const transport = await this.transport(serial);
        return new WaitBootCompleteCommand(transport).execute();
    }

    async waitForDevice(serial: Serial) {
        const conn = await this.connection();
        return new WaitForDeviceCommand(conn).execute(serial);
    }
}
