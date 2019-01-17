// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
import Command from '../../command';

const RE_OK = /restarting in/;

export default class TcpIpCommand extends Command {
    execute(port: string | number) {
        this._send(`tcpip:${port}`);
        return this._readReply(async parser => {
            const data = await parser.readAll();
            const value = data.toString();
            if (RE_OK.test(value)) {
                return port;
            } else {
                throw new Error(value.trim());
            }
        });
    }
}
