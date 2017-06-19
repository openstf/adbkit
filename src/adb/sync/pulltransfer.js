// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const Stream = require('stream')

class PullTransfer extends Stream.PassThrough {
  constructor() {
    super()
    this.stats =
      {bytesTransferred: 0}
  }

  cancel() {
    return this.emit('cancel')
  }

  write(chunk, encoding, callback) {
    this.stats.bytesTransferred += chunk.length
    this.emit('progress', this.stats)
    return super.write(chunk, encoding, callback)
  }
}

module.exports = PullTransfer
