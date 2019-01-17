import Command from '../../command';

export default class GetStateCommand extends Command {
    async execute(serial: string) {
        this._send(`host-serial:${serial}:get-state`);
        return this._readReply(async parser => {
            const value = await parser.readValue();
            return value.toString();
        });
    }
}
