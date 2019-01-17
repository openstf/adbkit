import MockConnection from '../../../mock/connection';
import Protocol from '../../../../src/adb/protocol';
import IsInstalledCommand from '../../../../src/adb/command/host-transport/isinstalled';

describe('IsInstalledCommand', () => {
    it("should send 'pm path <pkg>'", async () => {
        const conn = new MockConnection();
        const cmd = new IsInstalledCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData('shell:pm path foo 2>/dev/null').toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('package:foo\r\n');
            conn.socket.causeEnd();
        });
        await cmd.execute('foo');
    });

    it('should resolve with true if package returned by command', async () => {
        const conn = new MockConnection();
        const cmd = new IsInstalledCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('package:bar\r\n');
            conn.socket.causeEnd();
        });
        const found = await cmd.execute('foo');
        expect(found).toBe(true);
    });

    it('should resolve with false if no package returned', async () => {
        const conn = new MockConnection();
        const cmd = new IsInstalledCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeEnd();
        });
        const found = await cmd.execute('foo');
        expect(found).toBe(false);
    });

    it('should fail if any other data is received', async done => {
        const conn = new MockConnection();
        const cmd = new IsInstalledCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('open: Permission failed\r\n');
            conn.socket.causeEnd();
        });
        try {
            await cmd.execute('foo');
        } catch (err) {
            expect(err).toBeInstanceOf(Error);
            done();
        }
    });
});
