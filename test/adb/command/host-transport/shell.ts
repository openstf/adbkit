import MockConnection from '../../../mock/connection';
import Protocol from '../../../../src/adb/protocol';
import { FailError } from '../../../../src/adb/parser';
import ShellCommand from '../../../../src/adb/command/host-transport/shell';

describe('ShellCommand', () => {
    it('should pass String commands as-is', async () => {
        const conn = new MockConnection();
        const cmd = new ShellCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData("shell:foo 'bar").toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeEnd();
        });
        const out = await cmd.execute("foo 'bar");
    });

    it('should escape Array commands', async () => {
        const conn = new MockConnection();
        const cmd = new ShellCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData(
                    "shell:'foo' ''\"'\"'bar'\"'\"'' '\"'",
                ).toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeEnd();
        });
        const out = await cmd.execute(['foo', "'bar'", '"']);
    });

    it('should not escape numbers in arguments', async () => {
        const conn = new MockConnection();
        const cmd = new ShellCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData("shell:'foo' 67").toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeEnd();
        });
        const out = await cmd.execute(['foo', 67]);
    });

    it('should reject with FailError on ADB failure (not command failure)', async done => {
        const conn = new MockConnection();
        const cmd = new ShellCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData("shell:'foo'").toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.FAIL);
            conn.socket.causeRead(Protocol.encodeData('mystery'));
            conn.socket.causeEnd();
        });
        try {
            await cmd.execute(['foo']);
        } catch (err) {
            if (err instanceof FailError) done();
        }
    });
});
