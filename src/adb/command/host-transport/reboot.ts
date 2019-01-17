import Command from '../../command';

export default class RebootCommand extends Command {
    execute() {
        this._send('reboot:');
        return this._readReply(async parser => {
            await parser.readAll();
            return true;
        });
    }
}
