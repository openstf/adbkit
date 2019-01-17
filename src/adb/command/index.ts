import debugFunc from 'debug';
const debug = debugFunc('adb:command');

import Protocol from '../protocol';
import { IConnection } from '../connection';
import Parser from '../parser';

const RE_SQUOT = /'/g;
const RE_ESCAPE = /([$`\\!"])/g;

export default abstract class Command {
    parser = this.connection.parser;
    protocol = Protocol;

    constructor(public connection: IConnection) {}

    abstract execute(...args: any[]): Promise<any>;

    protected async _readReply<T>(
        helper: (parser: Parser) => T | PromiseLike<T>,
    ) {
        const parser = this.parser!;
        const reply = await parser.readAscii(4);
        switch (reply) {
            case Protocol.OKAY:
                return await helper(parser);
            case Protocol.FAIL:
                return parser.readError();
            default:
                return parser.unexpected(reply, 'OKAY or FAIL');
        }
    }

    protected _send(data: string) {
        const encoded = Protocol.encodeData(data);
        debug(`Send '${encoded}'`);
        this.connection.write(encoded);
        return this;
    }

    // Note that this is just for convenience, not security.
    protected _escape(arg: number): number;
    protected _escape(arg: string | boolean): string;
    protected _escape(arg: number | string | boolean): string | number;
    protected _escape(arg: number | string | boolean) {
        switch (typeof arg) {
            case 'number':
                return arg;
            default:
                return `'${arg.toString().replace(RE_SQUOT, "'\"'\"'")}'`;
        }
    }

    // Note that this is just for convenience, not security. Also, for some
    // incomprehensible reason, some Lenovo devices (e.g. Lenovo A806) behave
    // differently when arguments are given inside single quotes. See
    // https://github.com/openstf/stf/issues/471 for more information. So that's
    // why we now use double quotes here.
    protected _escapeCompat(arg: number | string) {
        switch (typeof arg) {
            case 'number':
                return arg;
            default:
                return `"${arg.toString().replace(RE_ESCAPE, '\\$1')}"`;
        }
    }
}
