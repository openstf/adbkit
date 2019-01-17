import Command from '../../command';

export default class LogCommand extends Command {
    execute(name: string) {
        this._send(`log:${name}`);
        return this._readReply(parser => parser.raw());
    }
}
