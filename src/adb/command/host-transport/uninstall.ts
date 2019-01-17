import Command from '../../command';

export default class UninstallCommand extends Command {
    execute(pkg: string) {
        this._send(`shell:pm uninstall ${pkg}`);
        return this._readReply(async parser => {
            try {
                const match = await parser.searchLine(
                    /^(Success|Failure.*|.*Unknown package:.*)$/,
                );
                if (match[1] === 'Success') {
                    return true;
                } else {
                    // Either way, the package was uninstalled or doesn't exist,
                    // which is good enough for us.
                    return true;
                }
            } finally {
                // Consume all remaining content to "naturally" close the
                // connection.
                await parser.readAll();
            }
        });
    }
}
