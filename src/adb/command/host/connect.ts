import Command from '../../command';

// Possible replies:
// "unable to connect to 192.168.2.2:5555"
// "connected to 192.168.2.2:5555"
// "already connected to 192.168.2.2:5555"
let RE_OK = /connected to|already connected/;

export default class ConnectCommand extends Command {
    async execute(host: string, port: string | number) {
        this._send(`host:connect:${host}:${port}`);
        return this._readReply(async parser => {
            const value = await parser.readValue();
            if (RE_OK.test(value.toString())) {
                return `${host}:${port}`;
            } else {
                throw new Error(value.toString());
            }
        });
    }
}
