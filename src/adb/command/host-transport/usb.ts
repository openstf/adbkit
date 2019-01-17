import Command from '../../command';

const RE_OK = /restarting in/;

export default class UsbCommand extends Command {
    async execute() {
        this._send('usb:');
        return this._readReply(async parser => {
            const data = await parser.readAll();
            const value = data.toString();
            if (RE_OK.test(value)) {
                return true;
            } else {
                throw new Error(value.trim());
            }
        });
    }
}
