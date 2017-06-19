// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const {EventEmitter} = require('events')

class PushTransfer extends EventEmitter {
  constructor() {
    super()
    this._stack = []
    this.stats =
      {bytesTransferred: 0}
  }

  cancel() {
    return this.emit('cancel')
  }

  push(byteCount) {
    return this._stack.push(byteCount)
  }

  pop() {
    const byteCount = this._stack.pop()
    this.stats.bytesTransferred += byteCount
    return this.emit('progress', this.stats)
  }

  end() {
    return this.emit('end')
  }
}

module.exports = PushTransfer
