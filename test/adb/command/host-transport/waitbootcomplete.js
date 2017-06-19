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
const WaitBootCompleteCommand =
  require('../../../../src/adb/command/host-transport/waitbootcomplete')

describe('WaitBootCompleteCommand', function() {

  it('should send a while loop with boot check', function(done) {
    const conn = new MockConnection
    const cmd = new WaitBootCompleteCommand(conn)
    const want =
      'shell:while getprop sys.boot_completed 2>/dev/null; do sleep 1; done'
    conn.socket.on('write', chunk =>
      expect(chunk.toString()).to.equal( 
        Protocol.encodeData(want).toString())
    )
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY)
      conn.socket.causeRead('1\r\n')
      return conn.socket.causeEnd()
    })
    return cmd.execute()
      .then(() => done())
  })

  it('should reject with Parser.PrematureEOFError if connection cuts \
prematurely', function(done) {
      const conn = new MockConnection
      const cmd = new WaitBootCompleteCommand(conn)
      setImmediate(function() {
        conn.socket.causeRead(Protocol.OKAY)
        return conn.socket.causeEnd()
      })
      return cmd.execute()
        .then(() => done(new Error('Succeeded even though it should not'))).catch(Parser.PrematureEOFError, err => done())
    })

  it('should not return until boot is complete', function(done) {
    const conn = new MockConnection
    const cmd = new WaitBootCompleteCommand(conn)
    let sent = false
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY)
      conn.socket.causeRead('\r\n')
      conn.socket.causeRead('\r\n')
      conn.socket.causeRead('\r\n')
      conn.socket.causeRead('\r\n')
      conn.socket.causeRead('\r\n')
      conn.socket.causeRead('\r\n')
      conn.socket.causeRead('\r\n')
      conn.socket.causeRead('\r\n')
      conn.socket.causeRead('\r\n')
      conn.socket.causeRead('\r\n')
      return setTimeout(function() {
        sent = true
        return conn.socket.causeRead('1\r\n')
      }
        , 50)
    })
    return cmd.execute()
      .then(function() {
        expect(sent).to.be.true
        return done()
      })
  })

  return it('should close connection when done', function(done) {
    const conn = new MockConnection
    const cmd = new WaitBootCompleteCommand(conn)
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY)
      return conn.socket.causeRead('1\r\n')
    })
    conn.socket.on('end', () => done())
    return cmd.execute()
  })
})
