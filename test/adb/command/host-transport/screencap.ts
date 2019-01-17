import MockConnection from '../../../mock/connection';
import Protocol from '../../../../src/adb/protocol';
import Parser from '../../../../src/adb/parser';
import ScreencapCommand from '../../../../src/adb/command/host-transport/screencap';

describe('ScreencapCommand', () => {
    it("should send 'screencap -p'", async () => {
        const conn = new MockConnection();
        const cmd = new ScreencapCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData(
                    'shell:echo && screencap -p 2>/dev/null',
                ).toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('\r\nlegit image');
            conn.socket.causeEnd();
        });
        const stream = await cmd.execute();
    });

    it('should resolve with the PNG stream', async () => {
        const conn = new MockConnection();
        const cmd = new ScreencapCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('\r\nlegit image');
            conn.socket.causeEnd();
        });
        const stream = await cmd.execute();
        const out = await new Parser(stream).readAll();
        expect(out.toString()).toBe('legit image');
    });

    it('should reject if command not supported', async done => {
        const conn = new MockConnection();
        const cmd = new ScreencapCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeEnd();
        });
        try {
            await cmd.execute();
        } catch (err) {
            done();
        }
    });

    it('should perform CRLF transformation by default', async () => {
        const conn = new MockConnection();
        const cmd = new ScreencapCommand(conn);
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
        const cmd = new ScreencapCommand(conn);
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
