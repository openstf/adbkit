import Command from '../../command';

export default class ReverseCommand extends Command {
    execute(remote: string, local: string) {
        this._send(`reverse:forward:${remote};${local}`);
        return this._readReply(() => this._readReply(() => true));
    }
}
