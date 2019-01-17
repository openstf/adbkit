import Command from '../../command';

export default class TcpCommand extends Command {
    execute(port: string | number, host?: string) {
        this._send(`tcp:${port}` + (host ? `:${host}` : ''));
        return this._readReply(parser => parser.raw());
    }
}
