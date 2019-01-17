import MockConnection from '../../../mock/connection';
import Protocol from '../../../../src/adb/protocol';
import WaitForDeviceCommand from '../../../../src/adb/command/host-serial/waitfordevice';

describe('WaitForDeviceCommand', () => {
    it("should send 'host-serial:<serial>:wait-for-any'", async () => {
        const conn = new MockConnection();
        const cmd = new WaitForDeviceCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData('host-serial:abba:wait-for-any').toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeEnd();
        });
        await cmd.execute('abba');
    });

    it('should resolve with id when the device is connected', async () => {
        const conn = new MockConnection();
        const cmd = new WaitForDeviceCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeEnd();
        });
        const id = await cmd.execute('abba');
        expect(id).toBe('abba');
    });

    return it('should reject with error if unable to connect', async done => {
        const conn = new MockConnection();
        const cmd = new WaitForDeviceCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead(Protocol.FAIL);
            conn.socket.causeRead(
                Protocol.encodeData('not sure how this might happen'),
            );
            conn.socket.causeEnd();
        });
        try {
            return cmd.execute('abba');
        } catch (err) {
            expect(err.message).toContain('not sure how this might happen');
            return done();
        }
    });
});
