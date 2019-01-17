import Command from '../../command';

export default class ListReversesCommand extends Command {
    async execute() {
        this._send('reverse:list-forward');
        return this._readReply(async parser => {
            const value = await parser.readValue();
            return this._parseReverses(value);
        });
    }

    private _parseReverses(value: Buffer) {
        const reverses: { remote: string; local: string }[] = [];
        for (const reverse of value.toString().split('\n')) {
            if (reverse) {
                const [serial, remote, local] = reverse.split(/\s+/);
                reverses.push({ remote, local });
            }
        }
        return reverses;
    }
}
