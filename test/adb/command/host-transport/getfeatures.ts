import MockConnection from '../../../mock/connection';
import Protocol from '../../../../src/adb/protocol';
import GetFeaturesCommand from '../../../../src/adb/command/host-transport/getfeatures';

describe('GetFeaturesCommand', () => {
    it("should send 'pm list features'", async () => {
        const conn = new MockConnection();
        const cmd = new GetFeaturesCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData(
                    'shell:pm list features 2>/dev/null',
                ).toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeEnd();
        });
        await cmd.execute();
    });

    it('should return an empty object for an empty feature list', async () => {
        const conn = new MockConnection();
        const cmd = new GetFeaturesCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeEnd();
        });
        const features = await cmd.execute();
        expect(Object.keys(features)).toHaveLength(0);
    });

    it('should return a map of features', async () => {
        const conn = new MockConnection();
        const cmd = new GetFeaturesCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead(`\
feature:reqGlEsVersion=0x20000
feature:foo\r
feature:bar\
`);
            conn.socket.causeEnd();
        });
        const features = await cmd.execute();
        expect(Object.keys(features)).toHaveLength(3);
        expect(features).toEqual({
            reqGlEsVersion: '0x20000',
            foo: true,
            bar: true,
        });
    });
});
