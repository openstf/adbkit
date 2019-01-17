import MockConnection from '../../../mock/connection';
import Protocol from '../../../../src/adb/protocol';
import TcpCommand from '../../../../src/adb/command/host-transport/tcp';
import { Readable } from 'stream';

describe('TcpCommand', () => {
    it("should send 'tcp:<port>' when no host given", async () => {
        const conn = new MockConnection();
        const cmd = new TcpCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData('tcp:8080').toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeEnd();
        });
        const stream = await cmd.execute(8080);
    });

    it("should send 'tcp:<port>:<host>' when host given", async () => {
        const conn = new MockConnection();
        const cmd = new TcpCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData('tcp:8080:127.0.0.1').toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeEnd();
        });
        const stream = await cmd.execute(8080, '127.0.0.1');
    });

    it('should resolve with the tcp stream', async () => {
        const conn = new MockConnection();
        const cmd = new TcpCommand(conn);
        setImmediate(() => conn.socket.causeRead(Protocol.OKAY));
        const stream = await cmd.execute(8080);
        stream.end();
        expect(stream).toBeInstanceOf(Readable);
    });
});
