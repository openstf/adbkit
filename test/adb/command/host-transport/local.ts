import { Readable } from 'stream';
import MockConnection from '../../../mock/connection';
import Protocol from '../../../../src/adb/protocol';
import LocalCommand from '../../../../src/adb/command/host-transport/local';

describe('LocalCommand', () => {
    it("should send 'localfilesystem:<path>'", async () => {
        const conn = new MockConnection();
        const cmd = new LocalCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData('localfilesystem:/foo.sock').toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeEnd();
        });
        const stream = await cmd.execute('/foo.sock');
    });

    it("should send '<type>:<path>' if <path> prefixed with '<type>:'", async () => {
        const conn = new MockConnection();
        const cmd = new LocalCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData('localabstract:/foo.sock').toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeEnd();
        });
        const stream = await cmd.execute('localabstract:/foo.sock');
    });

    it('should resolve with the stream', async () => {
        const conn = new MockConnection();
        const cmd = new LocalCommand(conn);
        setImmediate(() => conn.socket.causeRead(Protocol.OKAY));
        const stream = await cmd.execute('/foo.sock');
        stream.end();
        expect(stream).toBeInstanceOf(Readable);
    });
});
