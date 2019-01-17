import MockConnection from '../../../mock/connection';
import Protocol from '../../../../src/adb/protocol';
import RemountCommand from '../../../../src/adb/command/host-transport/remount';

describe('RemountCommand', () =>
    it("should send 'remount:'", async () => {
        const conn = new MockConnection();
        const cmd = new RemountCommand(conn);
        conn.socket.on('write', chunk => {
            expect(chunk.toString()).toBe(
                Protocol.encodeData('remount:').toString(),
            );
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeEnd();
        });
        await cmd.execute();
    }));
