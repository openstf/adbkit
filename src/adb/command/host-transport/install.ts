import Command from '../../command';

export default class InstallCommand extends Command {
    async execute(apk: string) {
        this._send(`shell:pm install -r ${this._escapeCompat(apk)}`);
        return this._readReply(async parser => {
            try {
                const match = await parser.searchLine(
                    /^(Success|Failure \[(.*?)\])$/,
                );
                if (match[1] === 'Success') {
                    return true;
                } else {
                    const code = match[2];
                    throw new ApkInstallError(
                        code,
                        `${apk} could not be installed`,
                    );
                }
            } finally {
                // Consume all remaining content to "naturally" close the
                // connection.
                await parser.readAll();
            }
        });
    }
}

export class ApkInstallError extends Error {
    constructor(public code: string, message: string) {
        super(); // TODO check sanity
        Error.call(this);
        this.name = 'FailError';
        this.message = `${message} [${code}]`;
        Error.captureStackTrace(this, ApkInstallError);
    }
}
