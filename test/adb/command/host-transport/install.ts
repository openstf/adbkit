import MockConnection from '../../../mock/connection';
import Protocol from '../../../../src/adb/protocol';
import InstallCommand from '../../../../src/adb/command/host-transport/install';

describe('InstallCommand', () => {
    it("should send 'pm install -r <apk>'", async () => {
        const conn = new MockConnection();
        const cmd = new InstallCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData('shell:pm install -r "foo"').toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Success\r\n');
            conn.socket.causeEnd();
        });
        await cmd.execute('foo');
    });

    it("should succeed when command responds with 'Success'", async () => {
        const conn = new MockConnection();
        const cmd = new InstallCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Success\r\n');
            conn.socket.causeEnd();
        });
        await cmd.execute('foo');
    });

    it("should reject if command responds with 'Failure [REASON]'", async done => {
        const conn = new MockConnection();
        const cmd = new InstallCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Failure [BAR]\r\n');
            conn.socket.causeEnd();
        });
        try {
            await cmd.execute('foo');
        } catch (err) {
            done();
        }
    });

    it("should give detailed reason in rejection's code property", async done => {
        const conn = new MockConnection();
        const cmd = new InstallCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Failure [ALREADY_EXISTS]\r\n');
            conn.socket.causeEnd();
        });
        try {
            await cmd.execute('foo');
        } catch (err) {
            expect(err.code).toBe('ALREADY_EXISTS');
            done();
        }
    });

    it('should ignore any other data', async () => {
        const conn = new MockConnection();
        const cmd = new InstallCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('open: Permission failed\r\n');
            conn.socket.causeRead('Success\r\n');
            conn.socket.causeEnd();
        });
        await cmd.execute('foo');
    });
});
