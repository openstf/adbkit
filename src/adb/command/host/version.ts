import Command from '../../command';

export default class HostVersionCommand extends Command {
    async execute() {
        this._send('host:version');
        return this._readReply(async parser => {
            const value = await parser.readValue();
            return this._parseVersion(value);
        });
    }

    _parseVersion(version: Buffer) {
        return parseInt(version.toString(), 16);
    }
}
