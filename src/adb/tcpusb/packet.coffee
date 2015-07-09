class Packet
  @A_SYNC = 0x434e5953
  @A_CNXN = 0x4e584e43
  @A_OPEN = 0x4e45504f
  @A_OKAY = 0x59414b4f
  @A_CLSE = 0x45534c43
  @A_WRTE = 0x45545257
  @A_AUTH = 0x48545541

  @checksum: (data) ->
    sum = 0
    sum += char for char in data if data
    return sum

  @magic: (command) ->
    # We need the full uint32 range, which ">>> 0" thankfully allows us to use
    (command ^ 0xffffffff) >>> 0

  @assemble: (command, arg0, arg1, data) ->
    if data
      chunk = new Buffer 24 + data.length
      chunk.writeUInt32LE command, 0
      chunk.writeUInt32LE arg0, 4
      chunk.writeUInt32LE arg1, 8
      chunk.writeUInt32LE data.length, 12
      chunk.writeUInt32LE Packet.checksum(data), 16
      chunk.writeUInt32LE Packet.magic(command), 20
      data.copy chunk, 24
      chunk
    else
      chunk = new Buffer 24
      chunk.writeUInt32LE command, 0
      chunk.writeUInt32LE arg0, 4
      chunk.writeUInt32LE arg1, 8
      chunk.writeUInt32LE 0, 12
      chunk.writeUInt32LE 0, 16
      chunk.writeUInt32LE Packet.magic(command), 20
      chunk

  @swap32: (n) ->
    buffer = new Buffer(4)
    buffer.writeUInt32LE(n, 0)
    buffer.readUInt32BE(0)

  constructor: (@command, @arg0, @arg1, @length, @check, @magic, @data = null) ->

  verifyChecksum: ->
    @check is Packet.checksum @data

  verifyMagic: ->
    @magic is Packet.magic @command

  toString: ->
    type = switch @command
      when Packet.A_SYNC
        "SYNC"
      when Packet.A_CNXN
        "CNXN"
      when Packet.A_OPEN
        "OPEN"
      when Packet.A_OKAY
        "OKAY"
      when Packet.A_CLSE
        "CLSE"
      when Packet.A_WRTE
        "WRTE"
      when Packet.A_AUTH
        "AUTH"
      else
        throw new Error "Unknown command {@command}"
    "#{type} arg0=#{@arg0} arg1=#{@arg1} length=#{@length}"

module.exports = Packet
