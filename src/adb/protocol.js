// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
class Protocol {
  static initClass() {
    this.OKAY = 'OKAY'
    this.FAIL = 'FAIL'
    this.STAT = 'STAT'
    this.LIST = 'LIST'
    this.DENT = 'DENT'
    this.RECV = 'RECV'
    this.DATA = 'DATA'
    this.DONE = 'DONE'
    this.SEND = 'SEND'
    this.QUIT = 'QUIT'
  }

  static decodeLength(length) {
    return parseInt(length, 16)
  }

  static encodeLength(length) {
    return (`0000${length.toString(16)}`).slice(-4).toUpperCase()
  }

  static encodeData(data) {
    if (!Buffer.isBuffer(data)) {
      data = new Buffer(data)
    }
    return Buffer.concat([new Buffer(Protocol.encodeLength(data.length)), data])
  }
}
Protocol.initClass()

module.exports = Protocol
