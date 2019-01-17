import Command from '../../command';

// Possible replies:
// "No such device 192.168.2.2:5555"
// ""
const RE_OK = /^$/;

export default class DisconnectCommand extends Command {
    async execute(host: string, port: string | number) {
        this._send(`host:disconnect:${host}:${port}`);
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
