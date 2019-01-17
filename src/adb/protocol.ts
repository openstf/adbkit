export default class Protocol {
    static readonly OKAY = 'OKAY';
    static readonly FAIL = 'FAIL';
    static readonly STAT = 'STAT';
    static readonly LIST = 'LIST';
    static readonly DENT = 'DENT';
    static readonly RECV = 'RECV';
    static readonly DATA = 'DATA';
    static readonly DONE = 'DONE';
    static readonly SEND = 'SEND';
    static readonly QUIT = 'QUIT';

    static decodeLength(length: string) {
        return parseInt(length, 16);
    }

    static encodeLength(length: number) {
        return `0000${length.toString(16)}`.slice(-4).toUpperCase();
    }

    static encodeData(data: any) {
        if (!Buffer.isBuffer(data)) {
            data = new Buffer(data);
        }
        return Buffer.concat([
            new Buffer(Protocol.encodeLength(data.length)),
            data,
        ]);
    }
}
