import Command from '../../command';

export default class ClearCommand extends Command {
    async execute(pkg: string) {
        this._send(`shell:pm clear ${pkg}`);
        return this._readReply(async parser => {
            let result: RegExpExecArray;
            try {
                result = await parser.searchLine(/^(Success|Failed)$/);
            } finally {
                await parser.end();
            }
            switch (result[0]) {
                case 'Success':
                    return true;
                case 'Failed':
                    // Unfortunately, the command may stall at this point and we
                    // have to kill the connection.
                    throw new Error(`Package '${pkg}' could not be cleared`);
                default:
                    throw new Error(`Unknown result ${result[0]}`);
            }
        });
    }
}
