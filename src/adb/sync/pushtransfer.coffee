{EventEmitter} = require 'events'

class PushTransfer extends EventEmitter
  constructor: ->
    super()
    @_stack = []
    @stats =
      bytesTransferred: 0

  cancel: ->
    this.emit 'cancel'

  push: (byteCount) ->
    @_stack.push byteCount

  pop: ->
    byteCount = @_stack.pop()
    @stats.bytesTransferred += byteCount
    this.emit 'progress', @stats

  end: ->
    this.emit 'end'

module.exports = PushTransfer
