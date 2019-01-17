import Command from '../../command';

export default class HostTransportCommand extends Command {
    async execute(serial: string) {
        this._send(`host:transport:${serial}`);
        return this._readReply(() => true);
    }
}
