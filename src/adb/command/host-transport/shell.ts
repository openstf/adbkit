import Command from '../../command';

export default class ShellCommand extends Command {
    execute(command: string | (string | number)[]) {
        if (Array.isArray(command)) {
            command = command.map(c => this._escape(c)).join(' ');
        }
        this._send(`shell:${command}`);
        return this._readReply(parser => parser.raw());
    }
}
