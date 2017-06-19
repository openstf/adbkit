/* eslint-disable
    no-cond-assign,
    no-empty,
    no-undef,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
const {EventEmitter} = require('events')

const Promise = require('bluebird')
const debug = require('debug')('adb:tcpusb:service')

const Parser = require('../parser')
const Protocol = require('../protocol')
const Packet = require('./packet')

class Service extends EventEmitter {
  constructor(client, serial, localId, remoteId, socket) {
    super()
    this.client = client
    this.serial = serial
    this.localId = localId
    this.remoteId = remoteId
    this.socket = socket
    this.opened = false
    this.ended = false
    this.transport = null
    this.needAck = false
  }

  end() {
    if (this.transport) { this.transport.end() }
    if (this.ended) { return this }
    debug('O:A_CLSE')
    const localId = this.opened ? this.localId : 0 // Zero can only mean a failed open
    try {
      // We may or may not have gotten here due to @socket ending, so write
      // may fail.
      this.socket.write(Packet.assemble(Packet.A_CLSE, localId, this.remoteId, null))
    } catch (err) {}
    // Let it go
    this.transport = null
    this.ended = true
    this.emit('end')
    return this
  }

  handle(packet) {
    return Promise.try(() => {
      switch (packet.command) {
      case Packet.A_OPEN:
        return this._handleOpenPacket(packet)
      case Packet.A_OKAY:
        return this._handleOkayPacket(packet)
      case Packet.A_WRTE:
        return this._handleWritePacket(packet)
      case Packet.A_CLSE:
        return this._handleClosePacket(packet)
      default:
        throw new Error(`Unexpected packet ${packet.command}`)
      }
    }).catch(err => {
      this.emit('error', err)
      return this.end()
    })
  }

  _handleOpenPacket(packet) {
    debug('I:A_OPEN', packet)
    return this.client.transport(this.serial)
      .then(transport => {
        this.transport = transport
        if (this.ended) { throw new LateTransportError() }
        this.transport.write(Protocol.encodeData( 
          packet.data.slice(0, -1))
        ) // Discard null byte at end
        return this.transport.parser.readAscii(4)
          .then(reply => {
            switch (reply) {
            case Protocol.OKAY:
              debug('O:A_OKAY')
              this.socket.write( 
                Packet.assemble(Packet.A_OKAY, this.localId, this.remoteId, null))
              return this.opened = true
            case Protocol.FAIL:
              return this.transport.parser.readError()
            default:
              return this.transport.parser.unexpected(reply, 'OKAY or FAIL')
            }
          })
      }).then(() => {
        return new Promise((resolve, reject) => {
          this.transport.socket
            .on('readable', () => this._tryPush())
            .on('end', resolve)
            .on('error', reject)
          return this._tryPush()
        })
      }).finally(() => {
        return this.end()
      })
  }

  _handleOkayPacket(packet) {
    debug('I:A_OKAY', packet)
    if (this.ended) { return }
    if (!this.transport) { throw new Service.PrematurePacketError(packet) }
    this.needAck = false
    return this._tryPush()
  }

  _handleWritePacket(packet) {
    debug('I:A_WRTE', packet)
    if (this.ended) { return }
    if (!this.transport) { throw new Service.PrematurePacketError(packet) }
    if (packet.data) { this.transport.write(packet.data) }
    debug('O:A_OKAY')
    return this.socket.write(Packet.assemble(Packet.A_OKAY, this.localId, this.remoteId, null))
  }

  _handleClosePacket(packet) {
    debug('I:A_CLSE', packet)
    if (this.ended) { return }
    if (!this.transport) { throw new Service.PrematurePacketError(packet) }
    return this.end()
  }

  _tryPush() {
    let chunk
    if (this.needAck || this.ended) { return }
    if (chunk = this._readChunk(this.transport.socket)) {
      debug('O:A_WRTE')
      this.socket.write(Packet.assemble(Packet.A_WRTE, this.localId, this.remoteId, chunk))
      return this.needAck = true
    }
  }

  _readChunk(stream) {
    return stream.read(this.socket.maxPayload) || stream.read()
  }
}

Service.PrematurePacketError = class PrematurePacketError extends Error {
  constructor(packet) {
    super() // TODO check sanity
    Error.call(this)
    this.name = 'PrematurePacketError'
    this.message = 'Premature packet'
    this.packet = packet
    Error.captureStackTrace(this, Service.PrematurePacketError)
  }
}

Service.LateTransportError = class LateTransportError extends Error {
  constructor() {
    super() // TODO check sanity
    Error.call(this)
    this.name = 'LateTransportError'
    this.message = 'Late transport'
    Error.captureStackTrace(this, Service.LateTransportError)
  }
}

module.exports = Service
