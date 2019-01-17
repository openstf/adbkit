import MockConnection from '../../../mock/connection';
import Protocol from '../../../../src/adb/protocol';
import TcpIpCommand from '../../../../src/adb/command/host-transport/tcpip';

describe('TcpIpCommand', () => {
    it("should send 'tcp:<port>'", async () => {
        const conn = new MockConnection();
        const cmd = new TcpIpCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData('tcpip:5555').toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('restarting in TCP mode port: 5555\n');
            conn.socket.causeEnd();
        });
        await cmd.execute(5555);
    });

    it('should resolve with the port', async () => {
        const conn = new MockConnection();
        const cmd = new TcpIpCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('restarting in TCP mode port: 5555\n');
            conn.socket.causeEnd();
        });
        const port = await cmd.execute(5555);
        expect(port).toBe(5555);
    });

    it('should reject on unexpected reply', async done => {
        const conn = new MockConnection();
        const cmd = new TcpIpCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('not sure what this could be\n');
            conn.socket.causeEnd();
        });
        try {
            await cmd.execute(5555);
        } catch (err) {
            expect(err.message).toEqual('not sure what this could be');
            done();
        }
    });
});
