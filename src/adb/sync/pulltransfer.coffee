Stream = require 'stream'

class PullTransfer extends Stream.PassThrough
  constructor: ->
    super()
    @stats =
      bytesTransferred: 0

  cancel: ->
    this.emit 'cancel'

  write: (chunk, encoding, callback) ->
    @stats.bytesTransferred += chunk.length
    this.emit 'progress', @stats
    super chunk, encoding, callback

module.exports = PullTransfer
