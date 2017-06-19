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
const WaitForDeviceCommand = 
  require('../../../../src/adb/command/host-serial/waitfordevice')

describe('WaitForDeviceCommand', function() {

  it('should send \'host-serial:<serial>:wait-for-any\'', function(done) {
    const conn = new MockConnection
    const cmd = new WaitForDeviceCommand(conn)
    conn.socket.on('write', chunk =>
      expect(chunk.toString()).to.equal( 
        Protocol.encodeData('host-serial:abba:wait-for-any').toString())
    )
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY)
      conn.socket.causeRead(Protocol.OKAY)
      return conn.socket.causeEnd()
    })
    return cmd.execute('abba')
      .then(() => done())
  })

  it('should resolve with id when the device is connected', function(done) {
    const conn = new MockConnection
    const cmd = new WaitForDeviceCommand(conn)
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY)
      conn.socket.causeRead(Protocol.OKAY)
      return conn.socket.causeEnd()
    })
    return cmd.execute('abba')
      .then(function(id) {
        expect(id).to.equal('abba')
        return done()
      })
  })

  return it('should reject with error if unable to connect', function(done) {
    const conn = new MockConnection
    const cmd = new WaitForDeviceCommand(conn)
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY)
      conn.socket.causeRead(Protocol.FAIL)
      conn.socket.causeRead( 
        Protocol.encodeData('not sure how this might happen'))
      return conn.socket.causeEnd()
    })
    return cmd.execute('abba')
      .catch(function(err) {
        expect(err.message).to.contain('not sure how this might happen')
        return done()
      })
  })
})
