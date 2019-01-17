import Command from '../../command';

export default class LocalCommand extends Command {
    async execute(path: string) {
        this._send(/:/.test(path) ? path : `localfilesystem:${path}`);
        return this._readReply(parser => parser.raw());
    }
}
