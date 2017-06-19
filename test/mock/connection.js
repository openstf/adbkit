// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/* eslint-env mocha */
const Parser = require('../../src/adb/parser')
const MockDuplex = require('./duplex')

class MockConnection {
  constructor() {
    this.socket = new MockDuplex
    this.parser = new Parser(this.socket)
  }

  end() {
    this.socket.causeEnd()
    return this
  }

  write() {
    this.socket.write.apply(this.socket, arguments)
    return this
  }
}

module.exports = MockConnection
