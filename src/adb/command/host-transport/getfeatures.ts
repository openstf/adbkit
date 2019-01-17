import Command from '../../command';

const RE_FEATURE = /^feature:(.*?)(?:=(.*?))?\r?$/gm;

export default class GetFeaturesCommand extends Command {
    async execute() {
        this._send('shell:pm list features 2>/dev/null');
        return this._readReply(async parser => {
            const data = await parser.readAll();
            return this._parseFeatures(data.toString());
        });
    }

    _parseFeatures(value: string) {
        let match;
        const features: { [s: string]: string | true } = {};
        while ((match = RE_FEATURE.exec(value))) {
            features[match[1]] = match[2] || true;
        }
        return features;
    }
}
