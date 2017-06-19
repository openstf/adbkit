/* eslint-disable
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/* eslint-env mocha */
const Stream = require('stream')

class MockDuplex extends Stream.Duplex {
  _read(size) {}

  _write(chunk, encoding, callback) {
    this.emit('write', chunk, encoding, callback)
    callback(null)
  }

  causeRead(chunk) {
    if (!Buffer.isBuffer(chunk)) {
      chunk = new Buffer(chunk)
    }
    this.push(chunk)
  }

  causeEnd() {
    this.push(null)
  }

  end() {
    this.causeEnd() // In order to better emulate socket streams
    return Stream.Duplex.prototype.end.apply(this, arguments)
  }
}

module.exports = MockDuplex
