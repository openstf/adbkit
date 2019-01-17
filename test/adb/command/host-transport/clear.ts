import MockConnection from '../../../mock/connection';
import Protocol from '../../../../src/adb/protocol';
import ClearCommand from '../../../../src/adb/command/host-transport/clear';

describe('ClearCommand', () => {
    it("should send 'pm clear <pkg>'", async () => {
        const conn = new MockConnection();
        const cmd = new ClearCommand(conn);
        conn.socket.on('write', chunk => {
            expect(chunk.toString()).toBe(
                Protocol.encodeData('shell:pm clear foo.bar.c').toString(),
            );
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Success\r\n');
            conn.socket.causeEnd();
        });
        await cmd.execute('foo.bar.c');
    });

    it("should succeed on 'Success'", async () => {
        const conn = new MockConnection();
        const cmd = new ClearCommand(conn);
        conn.socket.on('write', chunk => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Success\r\n');
            conn.socket.causeEnd();
        });
        await cmd.execute('foo.bar.c');
    });

    it("should error on 'Failed'", async done => {
        const conn = new MockConnection();
        const cmd = new ClearCommand(conn);
        conn.socket.on('write', chunk => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Failed\r\n');
            conn.socket.causeEnd();
        });
        try {
            await cmd.execute('foo.bar.c');
        } catch (err) {
            expect(err).toBeInstanceOf(Error);
            done();
        }
    });

    it("should error on 'Failed' even if connection not closed by device", async done => {
        const conn = new MockConnection();
        const cmd = new ClearCommand(conn);
        conn.socket.on('write', chunk => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Failed\r\n');
        });
        try {
            await cmd.execute('foo.bar.c');
        } catch (err) {
            expect(err).toBeInstanceOf(Error);
            done();
        }
    });

    it('should ignore irrelevant lines', async () => {
        const conn = new MockConnection();
        const cmd = new ClearCommand(conn);
        conn.socket.on('write', chunk => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Open: foo error\n\n');
            conn.socket.causeRead('Success\r\n');
            conn.socket.causeEnd();
        });
        await cmd.execute('foo.bar.c');
    });
});
