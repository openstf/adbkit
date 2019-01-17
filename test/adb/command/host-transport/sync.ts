import MockConnection from '../../../mock/connection';
import Protocol from '../../../../src/adb/protocol';
import SyncCommand from '../../../../src/adb/command/host-transport/sync';

describe('SyncCommand', () =>
    it("should send 'sync:'", async () => {
        const conn = new MockConnection();
        const cmd = new SyncCommand(conn as any);
        conn.socket.on('write', chunk => {
            expect(chunk.toString()).toBe(
                Protocol.encodeData('sync:').toString(),
            );
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeEnd();
        });
        await cmd.execute();
    }));
