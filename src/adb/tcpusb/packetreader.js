// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const {EventEmitter} = require('events')

const Packet = require('./packet')

class PacketReader extends EventEmitter {
  constructor(stream) {
    super()
    this.stream = stream
    this.inBody = false
    this.buffer = null
    this.packet = null
    this.stream.on('readable', this._tryRead.bind(this))
    this.stream.on('error', err => this.emit('error', err))
    this.stream.on('end', () => this.emit('end'))
    setImmediate(this._tryRead.bind(this))
  }

  _tryRead() {
    while (this._appendChunk()) {
      while (this.buffer) {
        if (this.inBody) {
          if (!(this.buffer.length >= this.packet.length)) { break }
          this.packet.data = this._consume(this.packet.length)
          if (!this.packet.verifyChecksum()) {
            this.emit('error', new PacketReader.ChecksumError(this.packet))
            return
          }
          this.emit('packet', this.packet)
          this.inBody = false
        } else {
          if (!(this.buffer.length >= 24)) { break }
          const header = this._consume(24)
          this.packet = new Packet(
            header.readUInt32LE(0),
            header.readUInt32LE(4),
            header.readUInt32LE(8),
            header.readUInt32LE(12),
            header.readUInt32LE(16),
            header.readUInt32LE(20),
            new Buffer(0)
          )
          if (!this.packet.verifyMagic()) {
            this.emit('error', new PacketReader.MagicError(this.packet))
            return
          }
          if (this.packet.length === 0) {
            this.emit('packet', this.packet)
          } else {
            this.inBody = true
          }
        }
      }
    }
  }

  _appendChunk() {
    let chunk
    if ((chunk = this.stream.read())) {
      if (this.buffer) {
        return this.buffer = Buffer.concat([this.buffer, chunk], this.buffer.length + chunk.length)
      } else {
        return this.buffer = chunk
      }
    } else {
      return null
    }
  }

  _consume(length) {
    const chunk = this.buffer.slice(0, length)
    this.buffer = length === this.buffer.length ? null : this.buffer.slice(length)
    return chunk
  }
}

PacketReader.ChecksumError = class ChecksumError extends Error {
  constructor(packet) {
    super() // TODO check sanity
    Error.call(this)
    this.name = 'ChecksumError'
    this.message = 'Checksum mismatch'
    this.packet = packet
    Error.captureStackTrace(this, PacketReader.ChecksumError)
  }
}

PacketReader.MagicError = class MagicError extends Error {
  constructor(packet) {
    super() // TODO check sanity
    Error.call(this)
    this.name = 'MagicError'
    this.message = 'Magic value mismatch'
    this.packet = packet
    Error.captureStackTrace(this, PacketReader.MagicError)
  }
}

module.exports = PacketReader
