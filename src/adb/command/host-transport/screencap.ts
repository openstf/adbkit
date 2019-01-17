import Command from '../../command';
import { PrematureEOFError } from '../../parser';
import LineTransform from '../../linetransform';

export default class ScreencapCommand extends Command {
    execute() {
        this._send('shell:echo && screencap -p 2>/dev/null');
        return this._readReply(async parser => {
            let transform = new LineTransform();
            try {
                const chunk = await parser.readBytes(1);
                transform = new LineTransform({ autoDetect: true });
                transform.write(chunk);
                return parser.raw().pipe(transform);
            } catch (err) {
                if (err instanceof PrematureEOFError) {
                    throw new Error('No support for the screencap command');
                } else {
                    throw err;
                }
            }
        });
    }
}
