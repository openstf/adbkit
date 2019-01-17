import MockConnection from '../../../mock/connection';
import Protocol from '../../../../src/adb/protocol';
import HostVersionCommand from '../../../../src/adb/command/host/version';

describe('HostVersionCommand', () => {
    it("should send 'host:version'", async () => {
        const conn = new MockConnection();
        const cmd = new HostVersionCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData('host:version').toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead(Protocol.encodeData('0000'));
            conn.socket.causeEnd();
        });
        const version = await cmd.execute();
    });

    it('should resolve with version', async () => {
        const conn = new MockConnection();
        const cmd = new HostVersionCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead(Protocol.encodeData((0x1234).toString(16)));
            conn.socket.causeEnd();
        });
        const version = await cmd.execute();
        expect(version).toBe(4660);
    });

    it('should handle old-style version', async () => {
        const conn = new MockConnection();
        const cmd = new HostVersionCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead((0x1234).toString(16));
            conn.socket.causeEnd();
        });
        const version = await cmd.execute();
        expect(version).toBe(4660);
    });
});
