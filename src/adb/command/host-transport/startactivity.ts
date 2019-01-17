import Command from '../../command';
import { PrematureEOFError } from '../../parser';

const RE_ERROR = /^Error: (.*)$/;
const EXTRA_TYPES = {
    string: 's',
    null: 'sn',
    bool: 'z',
    int: 'i',
    long: 'l',
    float: 'l',
    uri: 'u',
    component: 'cn',
};

type Args = Array<string | number>;

type Extra =
    | { type?: keyof typeof EXTRA_TYPES; value: any }
    | { type: 'string'; value: string[] | string }
    | { type: 'null'; value?: null[] | null }
    | { type: 'bool'; value: boolean[] | boolean }
    | { type: 'int' | 'long' | 'float'; value: number[] | number }
    | { type: 'uri'; value: string[] | string }
    | { type: 'component'; value: string[] | string };
type ShortExtra = Extra | null | string | boolean | number;
type LongExtra = Extra & { key: string };

type Extras = LongExtra[] | { [key: string]: ShortExtra };

export interface StartActivityOptions {
    debug?: boolean;
    wait?: boolean;
    user?: string | number | null;
    action?: string;
    data?: string;
    mimeType?: string;
    category?: string | string[];
    component?: string;
    flags?: number;
    extras?: Extras;
}

export default class StartActivityCommand extends Command {
    execute(options: StartActivityOptions) {
        const args = this._intentArgs(options);
        if (options.debug) {
            args.push('-D');
        }
        if (options.wait) {
            args.push('-W');
        }
        if (options.user || options.user === 0) {
            args.push('--user', this._escape(options.user));
        }
        return this._run('start', args);
    }

    _run(command: string, args: Args) {
        this._send(`shell:am ${command} ${args.join(' ')}`);
        return this._readReply(async parser => {
            let match;
            try {
                try {
                    match = await parser.searchLine(RE_ERROR);
                } finally {
                    parser.end();
                }
                throw new Error(match[1]);
            } catch (err) {
                if (err instanceof PrematureEOFError) {
                    return true;
                } else {
                    throw err;
                }
            }
        });
    }

    _intentArgs(options: StartActivityOptions) {
        const args: Args = [];
        if (options.extras) {
            args.push(...this._formatExtras(options.extras));
        }
        if (options.action) {
            args.push('-a', this._escape(options.action));
        }
        if (options.data) {
            args.push('-d', this._escape(options.data));
        }
        if (options.mimeType) {
            args.push('-t', this._escape(options.mimeType));
        }
        if (options.category) {
            if (Array.isArray(options.category)) {
                options.category.forEach(category =>
                    args.push('-c', this._escape(category)),
                );
            } else {
                args.push('-c', this._escape(options.category));
            }
        }
        if (options.component) {
            args.push('-n', this._escape(options.component));
        }
        if (options.flags) {
            args.push('-f', this._escape(options.flags));
        }
        return args;
    }

    _formatExtras(extras: Extras | null) {
        if (!extras) {
            return [];
        }
        if (Array.isArray(extras)) {
            return extras.reduce<Args>((all, extra) => {
                return all.concat(this._formatLongExtra(extra));
            }, []);
        } else {
            return Object.keys(extras).reduce<Args>((all, key) => {
                return all.concat(this._formatShortExtra(key, extras[key]));
            }, []);
        }
    }

    _formatShortExtra(key: string, value: ShortExtra) {
        let sugared: Partial<LongExtra> = { key };
        if (value === null) {
            sugared.type = 'null';
        } else if (Array.isArray(value)) {
            throw new Error(
                `Refusing to format array value '${key}' using short syntax;` +
                    ' empty array would cause unpredictable results due to' +
                    ' unknown type. Please use long syntax instead.',
            );
        } else {
            switch (typeof value) {
                case 'string':
                    sugared.type = 'string';
                    sugared.value = value;
                    break;
                case 'boolean':
                    sugared.type = 'bool';
                    sugared.value = value;
                    break;
                case 'number':
                    sugared.type = 'int';
                    sugared.value = value;
                    break;
                case 'object':
                    sugared = Object.assign(value, { key });
                    break;
            }
        }
        return this._formatLongExtra(sugared as LongExtra);
    }

    _formatLongExtra(extra: LongExtra) {
        const args: Args = [];
        if (!extra.type) {
            (extra as LongExtra).type = 'string';
        }
        const type = EXTRA_TYPES[extra.type!];
        if (!type) {
            throw new Error(
                `Unsupported type '${extra.type}' for extra '${extra.key}'`,
            );
        }
        if (extra.type === 'null') {
            args.push(`--e${type}`);
            args.push(this._escape(extra.key));
        } else if (Array.isArray(extra.value)) {
            args.push(`--e${type}a`);
            args.push(this._escape(extra.key));
            args.push(this._escape(extra.value.join(',')));
        } else {
            args.push(`--e${type}`);
            args.push(this._escape(extra.key));
            args.push(this._escape(extra.value));
        }
        return args;
    }
}
