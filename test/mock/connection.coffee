Parser = require '../../src/adb/parser'
MockDuplex = require './duplex'

class MockConnection
  constructor: ->
    @socket = new MockDuplex
    @parser = new Parser @socket

  end: ->
    @socket.causeEnd()
    return this

  write: ->
    @socket.write.apply @socket, arguments
    return this

  on: ->

module.exports = MockConnection
