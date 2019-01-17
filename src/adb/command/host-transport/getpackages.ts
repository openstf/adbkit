import Command from '../../command';

const RE_PACKAGE = /^package:(.*?)\r?$/gm;

export default class GetPackagesCommand extends Command {
    async execute() {
        this._send('shell:pm list packages 2>/dev/null');
        return this._readReply(async parser => {
            const data = await parser.readAll();
            return this._parsePackages(data.toString());
        });
    }

    private _parsePackages(value: string) {
        let match;
        const features = [];
        while ((match = RE_PACKAGE.exec(value))) {
            features.push(match[1]);
        }
        return features;
    }
}
