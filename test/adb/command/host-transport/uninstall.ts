import MockConnection from '../../../mock/connection';
import Protocol from '../../../../src/adb/protocol';
import { PrematureEOFError } from '../../../../src/adb/parser';
import UninstallCommand from '../../../../src/adb/command/host-transport/uninstall';

describe('UninstallCommand', () => {
    it("should succeed when command responds with 'Success'", async () => {
        const conn = new MockConnection();
        const cmd = new UninstallCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData('shell:pm uninstall foo').toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Success\r\n');
            conn.socket.causeEnd();
        });
        await cmd.execute('foo');
    });

    it("should succeed even if command responds with 'Failure'", async () => {
        const conn = new MockConnection();
        const cmd = new UninstallCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData('shell:pm uninstall foo').toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Failure\r\n');
            conn.socket.causeEnd();
        });
        await cmd.execute('foo');
    });

    it("should succeed even if command responds with 'Failure' \
with info in standard format", async () => {
        const conn = new MockConnection();
        const cmd = new UninstallCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData('shell:pm uninstall foo').toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Failure [DELETE_FAILED_INTERNAL_ERROR]\r\n');
            conn.socket.causeEnd();
        });
        await cmd.execute('foo');
    });

    it("should succeed even if command responds with 'Failure' \
with info info in weird format", async () => {
        const conn = new MockConnection();
        const cmd = new UninstallCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Failure - not installed for 0\r\n');
            conn.socket.causeEnd();
        });
        await cmd.execute('foo');
    });

    it('should succeed even if command responds with a buggy exception', async () => {
        const conn = new MockConnection();
        const cmd = new UninstallCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            // coffeelint: disable=max_line_length
            conn.socket.causeRead(`\

Exception occurred while dumping:
java.lang.IllegalArgumentException: Unknown package: foo
	at com.android.server.pm.Settings.isOrphaned(Settings.java:4134)
	at com.android.server.pm.PackageManagerService.isOrphaned(PackageManagerService.java:18066)
	at com.android.server.pm.PackageManagerService.deletePackage(PackageManagerService.java:15483)
	at com.android.server.pm.PackageInstallerService.uninstall(PackageInstallerService.java:888)
	at com.android.server.pm.PackageManagerShellCommand.runUninstall(PackageManagerShellCommand.java:765)
	at com.android.server.pm.PackageManagerShellCommand.onCommand(PackageManagerShellCommand.java:113)
	at android.os.ShellCommand.exec(ShellCommand.java:94)
	at com.android.server.pm.PackageManagerService.onShellCommand(PackageManagerService.java:18324)
	at android.os.Binder.shellCommand(Binder.java:468)
	at android.os.Binder.onTransact(Binder.java:367)
	at android.content.pm.IPackageManager$Stub.onTransact(IPackageManager.java:2387)
	at com.android.server.pm.PackageManagerService.onTransact(PackageManagerService.java:3019)
	at android.os.Binder.execTransact(Binder.java:565)\
`);
            // coffeelint: enable=max_line_length
            conn.socket.causeEnd();
        });
        await cmd.execute('foo');
    });

    it('should reject with Parser.PrematureEOFError if stream ends \
before match', async done => {
        const conn = new MockConnection();
        const cmd = new UninstallCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Hello. Is it me you are looking for?\r\n');
            conn.socket.causeEnd();
        });
        try {
            await cmd.execute('foo');
        } catch (err) {
            if (err instanceof PrematureEOFError) done();
        }
    });

    it('should ignore any other data', async () => {
        const conn = new MockConnection();
        const cmd = new UninstallCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData('shell:pm uninstall foo').toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('open: Permission failed\r\n');
            conn.socket.causeRead('Failure\r\n');
            conn.socket.causeEnd();
        });
        await cmd.execute('foo');
    });
});
