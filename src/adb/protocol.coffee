class Protocol
  @OKAY = 'OKAY'
  @FAIL = 'FAIL'

  @decodeLength: (length) ->
    parseInt length, 16

  @encodeLength: (length) ->
    ('0000' + length.toString 16).slice(-4).toUpperCase()

  @encodeData: (data) ->
    unless Buffer.isBuffer data
      data = new Buffer data
    Buffer.concat [new Buffer(Protocol.encodeLength data.length), data]

module.exports = Protocol
