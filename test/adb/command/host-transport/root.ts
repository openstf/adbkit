import MockConnection from '../../../mock/connection';
import Protocol from '../../../../src/adb/protocol';
import RootCommand from '../../../../src/adb/command/host-transport/root';

describe('RootCommand', () => {
    it("should send 'root:'", async () => {
        const conn = new MockConnection();
        const cmd = new RootCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData('root:').toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('restarting adbd as root\n');
            conn.socket.causeEnd();
        });
        const val = await cmd.execute();
        expect(val).toBe(true);
    });

    it('should reject on unexpected reply', async done => {
        const conn = new MockConnection();
        const cmd = new RootCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead(
                'adbd cannot run as root in production builds\n',
            );
            conn.socket.causeEnd();
        });
        try {
            await cmd.execute();
        } catch (err) {
            expect(err.message).toEqual(
                'adbd cannot run as root in production builds',
            );
            done();
        }
    });
});
