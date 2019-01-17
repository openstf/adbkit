import Command from '../../command';

const RE_KEYVAL = /^\[([\s\S]*?)\]: \[([\s\S]*?)\]\r?$/gm;

export default class GetPropertiesCommand extends Command {
    async execute() {
        this._send('shell:getprop');
        return this._readReply(async parser => {
            const data = await parser.readAll();
            return this._parseProperties(data.toString());
        });
    }

    private _parseProperties(value: string) {
        let match = RE_KEYVAL.exec(value);
        const properties: { [s: string]: string } = {};
        while (match) {
            properties[match[1]] = match[2];
        }
        return properties;
    }
}
