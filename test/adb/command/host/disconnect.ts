import MockConnection from '../../../mock/connection';
import Protocol from '../../../../src/adb/protocol';
import DisconnectCommand from '../../../../src/adb/command/host/disconnect';

describe('DisconnectCommand', () => {
    it("should send 'host:disconnect:<host>:<port>'", async () => {
        const conn = new MockConnection();
        const cmd = new DisconnectCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData(
                    'host:disconnect:192.168.2.2:5555',
                ).toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead(Protocol.encodeData(''));
            conn.socket.causeEnd();
        });
        await cmd.execute('192.168.2.2', 5555);
    });

    it('should resolve with the new device id if disconnected', async () => {
        const conn = new MockConnection();
        const cmd = new DisconnectCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead(Protocol.encodeData(''));
            conn.socket.causeEnd();
        });
        const val = await cmd.execute('192.168.2.2', 5555);
        expect(val).toBe('192.168.2.2:5555');
    });

    it('should reject with error if unable to disconnect', async done => {
        const conn = new MockConnection();
        const cmd = new DisconnectCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead(
                Protocol.encodeData('No such device 192.168.2.2:5555'),
            );
            conn.socket.causeEnd();
        });
        try {
            await cmd.execute('192.168.2.2', 5555);
        } catch (err) {
            expect(err.message).toBe('No such device 192.168.2.2:5555');
            done();
        }
    });
});
