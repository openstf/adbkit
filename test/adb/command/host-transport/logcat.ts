import MockConnection from '../../../mock/connection';
import Protocol from '../../../../src/adb/protocol';
import Parser from '../../../../src/adb/parser';
import LogcatCommand from '../../../../src/adb/command/host-transport/logcat';
import { Readable } from 'stream';

describe('LogcatCommand', () => {
    it("should send 'echo && logcat -B *:I'", async () => {
        const conn = new MockConnection();
        const cmd = new LogcatCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData(
                    'shell:echo && logcat -B *:I 2>/dev/null',
                ).toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeEnd();
        });
        const stream = await cmd.execute();
    });

    it("should send 'echo && logcat -c && logcat -B *:I' if options.clear is set", async () => {
        const conn = new MockConnection();
        const cmd = new LogcatCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData(
                    'shell:echo && logcat -c 2>/dev/null && logcat -B *:I 2>/dev/null',
                ).toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeEnd();
        });
        const stream = await cmd.execute({ clear: true });
    });

    it('should resolve with the logcat stream', async () => {
        const conn = new MockConnection();
        const cmd = new LogcatCommand(conn);
        setImmediate(() => conn.socket.causeRead(Protocol.OKAY));
        const stream = await cmd.execute();
        stream.end();
        expect(stream).toBeInstanceOf(Readable);
    });

    it('should perform CRLF transformation by default', async () => {
        const conn = new MockConnection();
        const cmd = new LogcatCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('\r\nfoo\r\n');
            conn.socket.causeEnd();
        });
        const stream = await cmd.execute();
        const out = await new Parser(stream).readAll();
        expect(out.toString()).toBe('foo\n');
    });

    it('should not perform CRLF transformation if not needed', async () => {
        const conn = new MockConnection();
        const cmd = new LogcatCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('\nfoo\r\n');
            conn.socket.causeEnd();
        });
        const stream = await cmd.execute();
        const out = await new Parser(stream).readAll();
        expect(out.toString()).toBe('foo\r\n');
    });
});
