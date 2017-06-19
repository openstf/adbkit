/* eslint-disable
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/* eslint-env mocha */
const Stream = require('stream')
const Promise = require('bluebird')
const Sinon = require('sinon')
const Chai = require('chai')
Chai.use(require('sinon-chai'))
const {expect} = Chai

const MockConnection = require('../../../mock/connection')
const Protocol = require('../../../../src/adb/protocol')
const Parser = require('../../../../src/adb/parser')
const LogcatCommand = require('../../../../src/adb/command/host-transport/logcat')

describe('LogcatCommand', function() {

  it('should send \'echo && logcat -B *:I\'', function(done) {
    const conn = new MockConnection
    const cmd = new LogcatCommand(conn)
    conn.socket.on('write', chunk =>
      expect(chunk.toString()).to.equal( 
        Protocol.encodeData('shell:echo && \
logcat -B *:I 2>/dev/null').toString()
      )
    )
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY)
      return conn.socket.causeEnd()
    })
    return cmd.execute()
      .then(stream => done())
  })

  it('should send \'echo && logcat -c && logcat -B *:I\' if options.clear \
is set', function(done) {
      const conn = new MockConnection
      const cmd = new LogcatCommand(conn)
      conn.socket.on('write', chunk =>
        expect(chunk.toString()).to.equal( 
          Protocol.encodeData('shell:echo && logcat -c 2>/dev/null && \
logcat -B *:I 2>/dev/null').toString()
        )
      )
      setImmediate(function() {
        conn.socket.causeRead(Protocol.OKAY)
        return conn.socket.causeEnd()
      })
      return cmd.execute({clear: true})
        .then(stream => done())
    })

  it('should resolve with the logcat stream', function(done) {
    const conn = new MockConnection
    const cmd = new LogcatCommand(conn)
    setImmediate(() => conn.socket.causeRead(Protocol.OKAY))
    return cmd.execute()
      .then(function(stream) {
        stream.end()
        expect(stream).to.be.an.instanceof(Stream.Readable)
        return done()
      })
  })

  it('should perform CRLF transformation by default', function(done) {
    const conn = new MockConnection
    const cmd = new LogcatCommand(conn)
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY)
      conn.socket.causeRead('\r\nfoo\r\n')
      return conn.socket.causeEnd()
    })
    return cmd.execute()
      .then(stream => new Parser(stream).readAll()).then(function(out) {
        expect(out.toString()).to.equal('foo\n')
        return done()
      })
  })

  return it('should not perform CRLF transformation if not needed', function(done) {
    const conn = new MockConnection
    const cmd = new LogcatCommand(conn)
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY)
      conn.socket.causeRead('\nfoo\r\n')
      return conn.socket.causeEnd()
    })
    return cmd.execute()
      .then(stream => new Parser(stream).readAll()).then(function(out) {
        expect(out.toString()).to.equal('foo\r\n')
        return done()
      })
  })
})
