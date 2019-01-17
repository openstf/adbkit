import Command from '../../command';

export default class GetDevicePathCommand extends Command {
    async execute(serial: string) {
        this._send(`host-serial:${serial}:get-devpath`);
        return this._readReply(async parser => {
            const value = await parser.readValue();
            return value.toString();
        });
    }
}
