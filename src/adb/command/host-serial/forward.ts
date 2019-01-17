import Command from '../../command';

export default class ForwardCommand extends Command {
    async execute(serial: string, local: string, remote: string) {
        this._send(`host-serial:${serial}:forward:${local};${remote}`);
        return this._readReply(() => this._readReply(() => true));
    }
}
