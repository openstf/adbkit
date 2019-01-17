import MockConnection from '../../../mock/connection';
import Protocol from '../../../../src/adb/protocol';
import GetPackagesCommand from '../../../../src/adb/command/host-transport/getpackages';

describe('GetPackagesCommand', () => {
    it("should send 'pm list packages'", async () => {
        const conn = new MockConnection();
        const cmd = new GetPackagesCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData(
                    'shell:pm list packages 2>/dev/null',
                ).toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeEnd();
        });
        await cmd.execute();
    });

    it('should return an empty array for an empty package list', async () => {
        const conn = new MockConnection();
        const cmd = new GetPackagesCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeEnd();
        });
        const packages = await cmd.execute();
        expect(packages).toHaveLength(0);
    });

    it('should return an array of packages', async () => {
        const conn = new MockConnection();
        const cmd = new GetPackagesCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead(`\
package:com.google.android.gm
package:com.google.android.inputmethod.japanese
package:com.google.android.tag\r
package:com.google.android.GoogleCamera
package:com.google.android.youtube
package:com.google.android.apps.magazines
package:com.google.earth\
`);
            conn.socket.causeEnd();
        });
        const packages = await cmd.execute();
        expect(packages).toHaveLength(7);
        expect(packages).toEqual([
            'com.google.android.gm',
            'com.google.android.inputmethod.japanese',
            'com.google.android.tag',
            'com.google.android.GoogleCamera',
            'com.google.android.youtube',
            'com.google.android.apps.magazines',
            'com.google.earth',
        ]);
    });
});
