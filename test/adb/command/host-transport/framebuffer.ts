import MockConnection from '../../../mock/connection';
import Protocol from '../../../../src/adb/protocol';
import FrameBufferCommand from '../../../../src/adb/command/host-transport/framebuffer';

describe('FrameBufferCommand', () => {
    it("should send 'framebuffer:'", async () => {
        const conn = new MockConnection();
        const cmd = new FrameBufferCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData('framebuffer:').toString(),
            ),
        );
        setImmediate(() => {
            const meta = new Buffer(52);
            meta.fill(0);
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead(meta);
            conn.socket.causeEnd();
        });
        await cmd.execute('raw');
    });

    it("should parse meta header and it as the 'meta' property of the stream", async () => {
        const conn = new MockConnection();
        const cmd = new FrameBufferCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData('framebuffer:').toString(),
            ),
        );
        setImmediate(() => {
            const meta = new Buffer(52);
            let offset = 0;
            meta.writeUInt32LE(1, offset);
            meta.writeUInt32LE(32, (offset += 4));
            meta.writeUInt32LE(819200, (offset += 4));
            meta.writeUInt32LE(640, (offset += 4));
            meta.writeUInt32LE(320, (offset += 4));
            meta.writeUInt32LE(0, (offset += 4));
            meta.writeUInt32LE(8, (offset += 4));
            meta.writeUInt32LE(16, (offset += 4));
            meta.writeUInt32LE(8, (offset += 4));
            meta.writeUInt32LE(8, (offset += 4));
            meta.writeUInt32LE(8, (offset += 4));
            meta.writeUInt32LE(24, (offset += 4));
            meta.writeUInt32LE(8, (offset += 4));
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead(meta);
            conn.socket.causeEnd();
        });
        const stream = await cmd.execute('raw');
        expect(stream).toHaveProperty('meta');
        expect(stream.meta).toEqual({
            version: 1,
            bpp: 32,
            size: 819200,
            width: 640,
            height: 320,
            red_offset: 0,
            red_length: 8,
            blue_offset: 16,
            blue_length: 8,
            green_offset: 8,
            green_length: 8,
            alpha_offset: 24,
            alpha_length: 8,
            format: 'rgba',
        });
    });
});
