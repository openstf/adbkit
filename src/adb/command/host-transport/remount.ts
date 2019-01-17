import Command from '../../command';

export default class RemountCommand extends Command {
    execute() {
        this._send('remount:');
        return this._readReply(() => true);
    }
}
