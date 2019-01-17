import Command from '../../command';

export default class GetSerialNoCommand extends Command {
    async execute(serial: string) {
        this._send(`host-serial:${serial}:get-serialno`);
        return this._readReply(async parser => {
            const value = await parser.readValue();
            return value.toString();
        });
    }
}
