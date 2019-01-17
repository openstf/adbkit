import MockConnection from '../../../mock/connection';
import Protocol from '../../../../src/adb/protocol';
import UsbCommand from '../../../../src/adb/command/host-transport/usb';

describe('UsbCommand', () => {
    it("should send 'usb:'", async () => {
        const conn = new MockConnection();
        const cmd = new UsbCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData('usb:').toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('restarting in USB mode\n');
            conn.socket.causeEnd();
        });
        const val = await cmd.execute();
        expect(val).toBe(true);
    });

    it('should reject on unexpected reply', async done => {
        const conn = new MockConnection();
        const cmd = new UsbCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('invalid port\n');
            conn.socket.causeEnd();
        });
        try {
            return cmd.execute();
        } catch (err) {
            expect(err.message).toEqual('invalid port');
            done();
        }
    });
});
