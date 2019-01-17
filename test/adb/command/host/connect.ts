import MockConnection from '../../../mock/connection';
import Protocol from '../../../../src/adb/protocol';
import ConnectCommand from '../../../../src/adb/command/host/connect';

describe('ConnectCommand', () => {
    it("should send 'host:connect:<host>:<port>'", async () => {
        const conn = new MockConnection();
        const cmd = new ConnectCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData('host:connect:192.168.2.2:5555').toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead(
                Protocol.encodeData('connected to 192.168.2.2:5555'),
            );
            conn.socket.causeEnd();
        });
        await cmd.execute('192.168.2.2', 5555);
    });

    it('should resolve with the new device id if connected', async () => {
        const conn = new MockConnection();
        const cmd = new ConnectCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead(
                Protocol.encodeData('connected to 192.168.2.2:5555'),
            );
            conn.socket.causeEnd();
        });
        const val = await cmd.execute('192.168.2.2', 5555);
        expect(val).toBe('192.168.2.2:5555');
    });

    it('should resolve with the new device id if already connected', async () => {
        const conn = new MockConnection();
        const cmd = new ConnectCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead(
                Protocol.encodeData('already connected to 192.168.2.2:5555'),
            );
            conn.socket.causeEnd();
        });
        const val = await cmd.execute('192.168.2.2', 5555);
        expect(val).toBe('192.168.2.2:5555');
    });

    it('should reject with error if unable to connect', async done => {
        const conn = new MockConnection();
        const cmd = new ConnectCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead(
                Protocol.encodeData('unable to connect to 192.168.2.2:5555'),
            );
            conn.socket.causeEnd();
        });
        try {
            await cmd.execute('192.168.2.2', 5555);
        } catch (err) {
            expect(err.message).toBe('unable to connect to 192.168.2.2:5555');
            done();
        }
    });
});
