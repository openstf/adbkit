/* eslint-disable
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/* eslint-env mocha */
const Stream = require('stream')
const Sinon = require('sinon')
const Chai = require('chai')
Chai.use(require('sinon-chai'))
const {expect} = Chai

const MockConnection = require('../../../mock/connection')
const Protocol = require('../../../../src/adb/protocol')
const Parser = require('../../../../src/adb/parser')
const UninstallCommand =
  require('../../../../src/adb/command/host-transport/uninstall')

describe('UninstallCommand', function() {

  it('should succeed when command responds with \'Success\'', function(done) {
    const conn = new MockConnection
    const cmd = new UninstallCommand(conn)
    conn.socket.on('write', chunk =>
      expect(chunk.toString()).to.equal( 
        Protocol.encodeData('shell:pm uninstall foo').toString())
    )
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY)
      conn.socket.causeRead('Success\r\n')
      return conn.socket.causeEnd()
    })
    return cmd.execute('foo')
      .then(() => done())
  })

  it('should succeed even if command responds with \'Failure\'', function(done) {
    const conn = new MockConnection
    const cmd = new UninstallCommand(conn)
    conn.socket.on('write', chunk =>
      expect(chunk.toString()).to.equal( 
        Protocol.encodeData('shell:pm uninstall foo').toString())
    )
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY)
      conn.socket.causeRead('Failure\r\n')
      return conn.socket.causeEnd()
    })
    return cmd.execute('foo')
      .then(() => done())
  })

  it('should succeed even if command responds with \'Failure\' \
with info in standard format', function(done) {
      const conn = new MockConnection
      const cmd = new UninstallCommand(conn)
      conn.socket.on('write', chunk =>
        expect(chunk.toString()).to.equal( 
          Protocol.encodeData('shell:pm uninstall foo').toString())
      )
      setImmediate(function() {
        conn.socket.causeRead(Protocol.OKAY)
        conn.socket.causeRead('Failure [DELETE_FAILED_INTERNAL_ERROR]\r\n')
        return conn.socket.causeEnd()
      })
      return cmd.execute('foo')
        .then(() => done())
    })

  it('should succeed even if command responds with \'Failure\' \
with info info in weird format', function(done) {
      const conn = new MockConnection
      const cmd = new UninstallCommand(conn)
      setImmediate(function() {
        conn.socket.causeRead(Protocol.OKAY)
        conn.socket.causeRead('Failure - not installed for 0\r\n')
        return conn.socket.causeEnd()
      })
      return cmd.execute('foo')
        .then(() => done())
    })

  it('should succeed even if command responds with a buggy exception', function(done) {
    const conn = new MockConnection
    const cmd = new UninstallCommand(conn)
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY)
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
`
      )
      // coffeelint: enable=max_line_length
      return conn.socket.causeEnd()
    })
    return cmd.execute('foo')
      .then(() => done())
  })

  it('should reject with Parser.PrematureEOFError if stream ends \
before match', function(done) {
      const conn = new MockConnection
      const cmd = new UninstallCommand(conn)
      setImmediate(function() {
        conn.socket.causeRead(Protocol.OKAY)
        conn.socket.causeRead('Hello. Is it me you are looking for?\r\n')
        return conn.socket.causeEnd()
      })
      return cmd.execute('foo')
        .catch(Parser.PrematureEOFError, err => done())
    })

  return it('should ignore any other data', function(done) {
    const conn = new MockConnection
    const cmd = new UninstallCommand(conn)
    conn.socket.on('write', chunk =>
      expect(chunk.toString()).to.equal( 
        Protocol.encodeData('shell:pm uninstall foo').toString())
    )
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY)
      conn.socket.causeRead('open: Permission failed\r\n')
      conn.socket.causeRead('Failure\r\n')
      return conn.socket.causeEnd()
    })
    return cmd.execute('foo')
      .then(() => done())
  })
})
