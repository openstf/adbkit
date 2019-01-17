import MockConnection from '../../../mock/connection';
import Protocol from '../../../../src/adb/protocol';
import Parser, { PrematureEOFError } from '../../../../src/adb/parser';
import WaitBootCompleteCommand from '../../../../src/adb/command/host-transport/waitbootcomplete';

describe('WaitBootCompleteCommand', () => {
    it('should send a while loop with boot check', async () => {
        const conn = new MockConnection();
        const cmd = new WaitBootCompleteCommand(conn);
        const want =
            'shell:while getprop sys.boot_completed 2>/dev/null; do sleep 1; done';
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(Protocol.encodeData(want).toString()),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('1\r\n');
            conn.socket.causeEnd();
        });
        await cmd.execute();
    });

    it('should reject with Parser.PrematureEOFError if connection cuts prematurely', async done => {
        const conn = new MockConnection();
        const cmd = new WaitBootCompleteCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeEnd();
        });
        try {
            await cmd.execute();
            throw new Error('Succeeded even though it should not');
        } catch (err) {
            if (err instanceof PrematureEOFError) done();
        }
    });

    it('should not return until boot is complete', async () => {
        const conn = new MockConnection();
        const cmd = new WaitBootCompleteCommand(conn);
        let sent = false;
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('\r\n');
            conn.socket.causeRead('\r\n');
            conn.socket.causeRead('\r\n');
            conn.socket.causeRead('\r\n');
            conn.socket.causeRead('\r\n');
            conn.socket.causeRead('\r\n');
            conn.socket.causeRead('\r\n');
            conn.socket.causeRead('\r\n');
            conn.socket.causeRead('\r\n');
            conn.socket.causeRead('\r\n');
            return setTimeout(() => {
                sent = true;
                conn.socket.causeRead('1\r\n');
            }, 50);
        });
        await cmd.execute();
        expect(sent).toBe(true);
    });

    it('should close connection when done', done => {
        const conn = new MockConnection();
        const cmd = new WaitBootCompleteCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('1\r\n');
        });
        conn.socket.on('end', () => done());
        return cmd.execute();
    });
});
