import Protocol from '../../src/adb/protocol';

describe('Protocol', () => {
    it("should expose a 'FAIL' property", () => {
        expect(Protocol).toHaveProperty('FAIL');
        expect(Protocol.FAIL).toBe('FAIL');
    });

    it("should expose an 'OKAY' property", () => {
        expect(Protocol).toHaveProperty('OKAY');
        expect(Protocol.OKAY).toBe('OKAY');
    });

    describe('@decodeLength(length)', () => {
        it('should return a Number', () => {
            expect(typeof Protocol.decodeLength('0x0046')).toBe('number');
        });

        it('should accept a hexadecimal string', () => {
            expect(Protocol.decodeLength('0x5887')).toBe(0x5887);
        });
    });

    describe('@encodeLength(length)', () => {
        it('should return a String', () => {
            expect(typeof Protocol.encodeLength(27)).toBe('string');
        });

        it('should return a valid hexadecimal number', () => {
            expect(parseInt(Protocol.encodeLength(32), 16)).toBe(32);
            expect(parseInt(Protocol.encodeLength(9999), 16)).toBe(9999);
        });

        it('should return uppercase hexadecimal digits', () => {
            expect(Protocol.encodeLength(0x0abc)).toBe('0ABC');
        });

        it('should pad short values with zeroes for a 4-byte size', () => {
            expect(Protocol.encodeLength(1)).toHaveLength(4);
            expect(Protocol.encodeLength(2)).toHaveLength(4);
            expect(Protocol.encodeLength(57)).toHaveLength(4);
        });

        return it('should return 0000 for 0 length', () => {
            expect(Protocol.encodeLength(0)).toBe('0000');
        });
    });

    return describe('@encodeData(data)', () => {
        it('should return a Buffer', () => {
            expect(Protocol.encodeData(new Buffer(''))).toBeInstanceOf(Buffer);
        });

        it('should accept a string or a Buffer', () => {
            expect(Protocol.encodeData('')).toBeInstanceOf(Buffer);
            expect(Protocol.encodeData(new Buffer(''))).toBeInstanceOf(Buffer);
        });

        return it('should prefix data with length', () => {
            const data = Protocol.encodeData(new Buffer(0x270f));
            expect(data).toHaveLength(0x270f + 4);
            expect(data.toString('ascii', 0, 4)).toBe('270F');
        });
    });
});
