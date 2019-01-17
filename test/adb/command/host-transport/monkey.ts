import MockConnection from '../../../mock/connection';
import Protocol from '../../../../src/adb/protocol';
import MonkeyCommand from '../../../../src/adb/command/host-transport/monkey';
import { Readable } from 'stream';

describe('MonkeyCommand', () => {
    it("should send 'monkey --port <port> -v'", async () => {
        const conn = new MockConnection();
        const cmd = new MonkeyCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData(
                    'shell:EXTERNAL_STORAGE=/data/local/tmp monkey --port 1080 -v',
                ).toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead(':Monkey: foo\n');
        });
        const stream = await cmd.execute(1080);
    });

    it('should resolve with the output stream', async () => {
        const conn = new MockConnection();
        const cmd = new MonkeyCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead(':Monkey: foo\n');
        });
        const stream = await cmd.execute(1080);
        stream.end();
        expect(stream).toBeInstanceOf(Readable);
    });

    it("should resolve after a timeout if result can't be judged from output", async () => {
        const conn = new MockConnection();
        const cmd = new MonkeyCommand(conn);
        setImmediate(() => conn.socket.causeRead(Protocol.OKAY));
        const stream = await cmd.execute(1080);
        stream.end();
        expect(stream).toBeInstanceOf(Readable);
    });
});
