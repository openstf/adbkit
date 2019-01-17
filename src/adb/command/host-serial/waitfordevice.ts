import Command from '../../command';

export default class WaitForDeviceCommand extends Command {
    async execute(serial: string) {
        this._send(`host-serial:${serial}:wait-for-any`);
        return this._readReply(() => this._readReply(() => serial));
    }
}
