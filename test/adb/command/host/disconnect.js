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
const DisconnectCommand = require('../../../../src/adb/command/host/disconnect')

describe('DisconnectCommand', function() {

  it('should send \'host:disconnect:<host>:<port>\'', function(done) {
    const conn = new MockConnection
    const cmd = new DisconnectCommand(conn)
    conn.socket.on('write', chunk =>
      expect(chunk.toString()).to.equal( 
        Protocol.encodeData('host:disconnect:192.168.2.2:5555').toString())
    )
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY)
      conn.socket.causeRead(Protocol.encodeData(''))
      return conn.socket.causeEnd()
    })
    return cmd.execute('192.168.2.2', 5555)
      .then(() => done())
  })

  it('should resolve with the new device id if disconnected', function(done) {
    const conn = new MockConnection
    const cmd = new DisconnectCommand(conn)
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY)
      conn.socket.causeRead(Protocol.encodeData(''))
      return conn.socket.causeEnd()
    })
    return cmd.execute('192.168.2.2', 5555)
      .then(function(val) {
        expect(val).to.be.equal('192.168.2.2:5555')
        return done()
      })
  })

  return it('should reject with error if unable to disconnect', function(done) {
    const conn = new MockConnection
    const cmd = new DisconnectCommand(conn)
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY)
      conn.socket.causeRead( 
        Protocol.encodeData('No such device 192.168.2.2:5555'))
      return conn.socket.causeEnd()
    })
    return cmd.execute('192.168.2.2', 5555)
      .catch(function(err) {
        expect(err.message).to.eql('No such device 192.168.2.2:5555')
        return done()
      })
  })
})
