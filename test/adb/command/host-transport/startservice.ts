import MockConnection from '../../../mock/connection';
import Protocol from '../../../../src/adb/protocol';
import StartServiceCommand from '../../../../src/adb/command/host-transport/startservice';

describe('StartServiceCommand', () => {
    it("should succeed when 'Success' returned", async () => {
        const conn = new MockConnection();
        const cmd = new StartServiceCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Success');
            conn.socket.causeEnd();
        });
        const options = { component: 'com.dummy.component/.Main' };
        await cmd.execute(options);
    });

    it("should fail when 'Error' returned", async done => {
        const conn = new MockConnection();
        const cmd = new StartServiceCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Error: foo\n');
            conn.socket.causeEnd();
        });
        const options = { component: 'com.dummy.component/.Main' };
        try {
            await cmd.execute(options);
        } catch (err) {
            expect(err).toBeInstanceOf(Error);
            done();
        }
    });

    it("should send 'am startservice --user 0 -n <pkg>'", async () => {
        const conn = new MockConnection();
        const cmd = new StartServiceCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData(
                    "shell:am startservice \
-n 'com.dummy.component/.Main' \
--user 0",
                ).toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Success\n');
            conn.socket.causeEnd();
        });
        const options = {
            component: 'com.dummy.component/.Main',
            user: 0,
        };
        await cmd.execute(options);
    });

    it("should not send user option if not set'", async () => {
        const conn = new MockConnection();
        const cmd = new StartServiceCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData(
                    "shell:am startservice \
-n 'com.dummy.component/.Main'",
                ).toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Success\n');
            conn.socket.causeEnd();
        });
        const options = { component: 'com.dummy.component/.Main' };
        await cmd.execute(options);
    });
});
