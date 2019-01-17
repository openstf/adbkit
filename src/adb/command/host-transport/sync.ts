import Command from '../../command';
import Sync from '../../sync';
import Connection from '../../connection';

export default class SyncCommand extends Command {
    constructor(public connection: Connection) {
        super(connection);
    }

    execute() {
        this._send('sync:');
        return this._readReply(() => new Sync(this.connection));
    }
}
