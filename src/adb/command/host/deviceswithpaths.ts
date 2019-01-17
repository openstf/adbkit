import Command from '../../command';

export default class HostDevicesWithPathsCommand extends Command {
    async execute() {
        this._send('host:devices-l');
        return this._readReply(this._readDevices);
    }

    private _readDevices = async () => {
        const value = await this.parser!.readValue();
        return this._parseDevices(value);
    };

    private _parseDevices(value: Buffer) {
        const devices: { id: string; type: string; path: string }[] = [];
        if (!value.length) {
            return devices;
        }
        for (const line of value.toString('ascii').split('\n')) {
            if (line) {
                // For some reason, the columns are separated by spaces instead of tabs
                const [id, type, path] = line.split(/\s+/);
                devices.push({ id, type, path });
            }
        }
        return devices;
    }
}
