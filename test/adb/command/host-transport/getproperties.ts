import MockConnection from '../../../mock/connection';
import Protocol from '../../../../src/adb/protocol';
import GetPropertiesCommand from '../../../../src/adb/command/host-transport/getproperties';

describe('GetPropertiesCommand', () => {
    it.skip("should send 'getprop'", async () => {
        const conn = new MockConnection();
        const cmd = new GetPropertiesCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData('shell:getprop').toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeEnd();
        });
        await cmd.execute();
    });

    it.skip('should return an empty object for an empty property list', async () => {
        const conn = new MockConnection();
        const cmd = new GetPropertiesCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeEnd();
        });
        const properties = await cmd.execute();
        expect(Object.keys(properties)).toHaveLength(0);
    });

    it.skip('should return a map of properties', async () => {
        const conn = new MockConnection();
        const cmd = new GetPropertiesCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead(`\
[ro.product.locale.region]: [US]
[ro.product.manufacturer]: [samsung]\r
[ro.product.model]: [SC-04E]
[ro.product.name]: [SC-04E]\
`);
            conn.socket.causeEnd();
        });
        const properties = await cmd.execute();
        expect(Object.keys(properties)).toHaveLength(4);
        expect(properties).toEqual({
            'ro.product.locale.region': 'US',
            'ro.product.manufacturer': 'samsung',
            'ro.product.model': 'SC-04E',
            'ro.product.name': 'SC-04E',
        });
    });
});
