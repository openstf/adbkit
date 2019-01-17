import Command from '../../command';

export default class ListForwardsCommand extends Command {
    async execute(serial: string) {
        this._send(`host-serial:${serial}:list-forward`);
        return this._readReply(async parser => {
            const value = await parser.readValue();
            return this._parseForwards(value);
        });
    }

    private _parseForwards(value: Buffer) {
        const forwards = [];
        for (const forward of value.toString().split('\n')) {
            if (forward) {
                const [serial, local, remote] = forward.split(/\s+/);
                forwards.push({ serial, local, remote });
            }
        }
        return forwards;
    }
}
