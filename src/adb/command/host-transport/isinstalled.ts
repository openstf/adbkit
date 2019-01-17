import Command from '../../command';
import { PrematureEOFError } from '../../parser';

export default class IsInstalledCommand extends Command {
    async execute(pkg: string) {
        this._send(`shell:pm path ${pkg} 2>/dev/null`);
        return this._readReply(async parser => {
            try {
                const reply = await parser.readAscii(8);
                switch (reply) {
                    case 'package:':
                        return true;
                    default:
                        return parser.unexpected(reply, "'package:'");
                }
            } catch (err) {
                if (err instanceof PrematureEOFError) {
                    return false;
                } else {
                    throw err;
                }
            }
        });
    }
}
