// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
export default class Packet {
    static readonly A_SYNC = 0x434e5953;
    static readonly A_CNXN = 0x4e584e43;
    static readonly A_OPEN = 0x4e45504f;
    static readonly A_OKAY = 0x59414b4f;
    static readonly A_CLSE = 0x45534c43;
    static readonly A_WRTE = 0x45545257;
    static readonly A_AUTH = 0x48545541;

    static checksum(data: Iterable<number>) {
        let sum = 0;
        if (data) {
            for (const char of data) {
                sum += char;
            }
        }
        return sum;
    }

    static magic(command: number) {
        // We need the full uint32 range, which ">>> 0" thankfully allows us to use
        return (command ^ 0xffffffff) >>> 0;
    }

    static assemble(
        command: number,
        arg0: number,
        arg1: number,
        data: Buffer | null,
    ) {
        let chunk: Buffer;
        if (data) {
            chunk = new Buffer(24 + data.length);
            chunk.writeUInt32LE(command, 0);
            chunk.writeUInt32LE(arg0, 4);
            chunk.writeUInt32LE(arg1, 8);
            chunk.writeUInt32LE(data.length, 12);
            chunk.writeUInt32LE(Packet.checksum(data), 16);
            chunk.writeUInt32LE(Packet.magic(command), 20);
            data.copy(chunk, 24);
            return chunk;
        } else {
            chunk = new Buffer(24);
            chunk.writeUInt32LE(command, 0);
            chunk.writeUInt32LE(arg0, 4);
            chunk.writeUInt32LE(arg1, 8);
            chunk.writeUInt32LE(0, 12);
            chunk.writeUInt32LE(0, 16);
            chunk.writeUInt32LE(Packet.magic(command), 20);
            return chunk;
        }
    }

    static swap32(n: number) {
        const buffer = new Buffer(4);
        buffer.writeUInt32LE(n, 0);
        return buffer.readUInt32BE(0);
    }

    constructor(
        public command: number,
        public arg0: number,
        public arg1: number,
        public length: number,
        public check: number,
        public magic: number,
        public data: Buffer,
    ) {}

    verifyChecksum() {
        return this.check === Packet.checksum(this.data);
    }

    verifyMagic() {
        return this.magic === Packet.magic(this.command);
    }

    toString() {
        const type = (() => {
            switch (this.command) {
                case Packet.A_SYNC:
                    return 'SYNC';
                case Packet.A_CNXN:
                    return 'CNXN';
                case Packet.A_OPEN:
                    return 'OPEN';
                case Packet.A_OKAY:
                    return 'OKAY';
                case Packet.A_CLSE:
                    return 'CLSE';
                case Packet.A_WRTE:
                    return 'WRTE';
                case Packet.A_AUTH:
                    return 'AUTH';
                default:
                    throw new Error('Unknown command {@command}');
            }
        })();
        return `${type} arg0=${this.arg0} arg1=${this.arg1} length=${
            this.length
        }`;
    }
}
