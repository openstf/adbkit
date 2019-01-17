import Command from '../../command';

export default class HostKillCommand extends Command {
    async execute() {
        this._send('host:kill');
        return this._readReply(() => true);
    }
}
