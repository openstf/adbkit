import Command from '../../command';
import { DevicesCommand, Device } from '../../tracker';

export abstract class HostDevicesCommandBase extends Command
    implements DevicesCommand {
    _readDevices = async () => {
        const value = await this.parser!.readValue();
        return this._parseDevices(value);
    };

    private _parseDevices(value: Buffer) {
        const devices: Device[] = [];
        if (!value.length) {
            return devices;
        }
        for (const line of value.toString('ascii').split('\n')) {
            if (line) {
                const [id, type] = Array.from(line.split('\t'));
                devices.push({ id, type });
            }
        }
        return devices;
    }
}

export default class HostDevicesCommand extends HostDevicesCommandBase {
    async execute() {
        this._send('host:devices');
        return this._readReply(this._readDevices);
    }
}
