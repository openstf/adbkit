import Command from '../../command';

const timeout = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default class MonkeyCommand extends Command {
    async execute(port: string | number) {
        // Some devices have broken /sdcard (i.e. /mnt/sdcard), which monkey will
        // attempt to use to write log files to. We can cheat and set the location
        // with an environment variable, because most logs use
        // Environment.getLegacyExternalStorageDirectory() like they should. There
        // are some hardcoded logs, though. Anyway, this should enable most things.
        // Check https://github.com/android/platform_frameworks_base/blob/master/
        // core/java/android/os/Environment.java for the variables.
        this._send(
            `shell:EXTERNAL_STORAGE=/data/local/tmp monkey --port ${port} -v`,
        );

        return this._readReply(async parser => {
            // The monkey command is a bit weird in that it doesn't look like
            // it starts in daemon mode, but it actually does. So even though
            // the command leaves the terminal "hanging", Ctrl-C (or just
            // ending the connection) will not end the daemon. HOWEVER, on
            // some devices, such as SO-02C by Sony, it is required to leave
            // the command hanging around. In any case, if the command exits
            // by itself, it means that something went wrong.

            // On some devices (such as F-08D by Fujitsu), the monkey
            // command gives no output no matter how many verbose flags you
            // give it. So we use a fallback timeout.
            await Promise.race([parser.searchLine(/^:Monkey:/), timeout(1000)]);
            return parser.raw();
        });
    }
}
