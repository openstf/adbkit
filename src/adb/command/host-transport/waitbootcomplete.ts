import Command from '../../command';

export default class WaitBootCompleteCommand extends Command {
    execute() {
        this._send(
            'shell:while getprop sys.boot_completed 2>/dev/null; do sleep 1; done',
        );
        return this._readReply(async parser => {
            try {
                await parser.searchLine(/^1$/);
            } finally {
                await parser.end();
            }
            return true;
        });
    }
}
