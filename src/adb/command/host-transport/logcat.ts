// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
import Command from '../../command';
import LineTransform from '../../linetransform';

interface LogcatOptions {
    clear?: boolean;
}

export default class LogcatCommand extends Command {
    execute(options: LogcatOptions = {}) {
        // For some reason, LG G Flex requires a filter spec with the -B option.
        // It doesn't actually use it, though. Regardless of the spec we always get
        // all events on all devices.
        let cmd = 'logcat -B *:I 2>/dev/null';
        if (options.clear) {
            cmd = `logcat -c 2>/dev/null && ${cmd}`;
        }
        this._send(`shell:echo && ${cmd}`);
        return this._readReply(parser =>
            parser.raw().pipe(new LineTransform({ autoDetect: true })),
        );
    }
}
