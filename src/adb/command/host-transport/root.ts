import Command from '../../command';

const RE_OK = /restarting adbd as root/;

export default class RootCommand extends Command {
    execute() {
        this._send('root:');
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
