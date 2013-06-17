Command = require '../command'
Protocol = require '../protocol'
FrameBuffer = require '../framebuffer'

class FrameBufferCommand extends Command
  execute: (callback) ->
    @parser.readAscii 4, (reply) =>
      switch reply
        when Protocol.OKAY
          framebuffer = new FrameBuffer @connection
          framebuffer.once 'ready', ->
            callback null, framebuffer
        when Protocol.FAIL
          @parser.readError callback
        else
          callback this._unexpected reply
    this._send 'framebuffer:'

module.exports = FrameBufferCommand
