Stream = require 'stream'

class MockDuplex extends Stream.Duplex
  _read: (size) ->

  _write: (chunk, encoding, callback) ->
    @emit 'write', chunk, encoding, callback
    callback null
    return

  causeRead: (chunk) ->
    unless Buffer.isBuffer chunk
      chunk = new Buffer chunk
    this.push chunk
    return

  causeEnd: ->
    this.push null
    return

module.exports = MockDuplex
