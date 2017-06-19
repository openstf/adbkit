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
const ShellCommand =
  require('../../../../src/adb/command/host-transport/shell')

describe('ShellCommand', function() {

  it('should pass String commands as-is', function(done) {
    const conn = new MockConnection
    const cmd = new ShellCommand(conn)
    conn.socket.on('write', chunk =>
      expect(chunk.toString()).to.equal( 
        Protocol.encodeData('shell:foo \'bar').toString())
    )
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY)
      return conn.socket.causeEnd()
    })
    return cmd.execute('foo \'bar')
      .then(out => done())
  })

  it('should escape Array commands', function(done) {
    const conn = new MockConnection
    const cmd = new ShellCommand(conn)
    conn.socket.on('write', chunk =>
      expect(chunk.toString()).to.equal( 
        Protocol.encodeData('shell:\'foo\' \'\'"\'"\'bar\'"\'"\'\' \'"\'').toString())
    )
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY)
      return conn.socket.causeEnd()
    })
    return cmd.execute(['foo', '\'bar\'', '"'])
      .then(out => done())
  })

  it('should not escape numbers in arguments', function(done) {
    const conn = new MockConnection
    const cmd = new ShellCommand(conn)
    conn.socket.on('write', chunk =>
      expect(chunk.toString()).to.equal( 
        Protocol.encodeData('shell:\'foo\' 67').toString())
    )
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY)
      return conn.socket.causeEnd()
    })
    return cmd.execute(['foo', 67])
      .then(out => done())
  })

  return it('should reject with FailError on ADB failure (not command \
failure)', function(done) {
      const conn = new MockConnection
      const cmd = new ShellCommand(conn)
      conn.socket.on('write', chunk =>
        expect(chunk.toString()).to.equal( 
          Protocol.encodeData('shell:\'foo\'').toString())
      )
      setImmediate(function() {
        conn.socket.causeRead(Protocol.FAIL)
        conn.socket.causeRead(Protocol.encodeData('mystery'))
        return conn.socket.causeEnd()
      })
      return cmd.execute(['foo'])
        .catch(Parser.FailError, err => done())
    })
})
