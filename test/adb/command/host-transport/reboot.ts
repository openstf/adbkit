import MockConnection from '../../../mock/connection';
import Protocol from '../../../../src/adb/protocol';
import RebootCommand from '../../../../src/adb/command/host-transport/reboot';

describe('RebootCommand', () => {
    it("should send 'reboot:'", async () => {
        const conn = new MockConnection();
        const cmd = new RebootCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData('reboot:').toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeEnd();
        });
        await cmd.execute();
    });

    it('should send wait for the connection to end', async () => {
        const conn = new MockConnection();
        const cmd = new RebootCommand(conn);
        let ended = false;
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData('reboot:').toString(),
            ),
        );
        setImmediate(() => conn.socket.causeRead(Protocol.OKAY));
        setImmediate(() => {
            ended = true;
            conn.socket.causeEnd();
        });
        await cmd.execute();
        expect(ended).toBe(true);
    });
});
