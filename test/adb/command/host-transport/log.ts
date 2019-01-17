import { Readable } from 'stream';
import LogCommand from '../../../../src/adb/command/host-transport/log';
import Protocol from '../../../../src/adb/protocol';
import MockConnection from '../../../mock/connection';

describe('LogCommand', () => {
    it("should send 'log:<log>'", async () => {
        const conn = new MockConnection();
        const cmd = new LogCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData('log:main').toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeEnd();
        });
        const stream = await cmd.execute('main');
    });

    it('should resolve with the log stream', async () => {
        const conn = new MockConnection();
        const cmd = new LogCommand(conn);
        setImmediate(() => conn.socket.causeRead(Protocol.OKAY));
        const stream = await cmd.execute('main');
        stream.end();
        expect(stream).toBeInstanceOf(Readable);
    });
});
