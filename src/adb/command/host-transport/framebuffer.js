/* eslint-disable
    no-case-declarations,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
const Assert = require('assert')
const {spawn} = require('child_process')
const debug = require('debug')('adb:command:framebuffer')

const Command = require('../../command')
const Protocol = require('../../protocol')
const RgbTransform = require('../../framebuffer/rgbtransform')

class FrameBufferCommand extends Command {
  execute(format) {
    this._send('framebuffer:')
    return this.parser.readAscii(4)
      .then(reply => {
        switch (reply) {
        case Protocol.OKAY:
          return this.parser.readBytes(52)
            .then(header => {
              const meta = this._parseHeader(header)
              switch (format) {
              case 'raw':
                let stream = this.parser.raw()
                stream.meta = meta
                return stream
              default:
                stream = this._convert(meta, format)
                stream.meta = meta
                return stream
              }
            })
        case Protocol.FAIL:
          return this.parser.readError()
        default:
          return this.parser.unexpected(reply, 'OKAY or FAIL')
        }
      })
  }

  _convert(meta, format, raw) {
    debug(`Converting raw framebuffer stream into ${format.toUpperCase()}`)
    switch (meta.format) {
    case 'rgb': case 'rgba':
      break
      // Known to be supported by GraphicsMagick
    default:
      debug(`Silently transforming '${meta.format}' into 'rgb' for \`gm\``)
      const transform = new RgbTransform(meta)
      meta.format = 'rgb'
      raw = this.parser.raw().pipe(transform)
    }
    const proc = spawn('gm', [
      'convert',
      '-size',
      `${meta.width}x${meta.height}`,
      `${meta.format}:-`,
      `${format}:-`
    ])
    raw.pipe(proc.stdin)
    return proc.stdout
  }

  _parseHeader(header) {
    const meta = {}
    let offset = 0
    meta.version = header.readUInt32LE(offset)
    if (meta.version === 16) {
      throw new Error('Old-style raw images are not supported')
    }
    offset += 4
    meta.bpp = header.readUInt32LE(offset)
    offset += 4
    meta.size = header.readUInt32LE(offset)
    offset += 4
    meta.width = header.readUInt32LE(offset)
    offset += 4
    meta.height = header.readUInt32LE(offset)
    offset += 4
    meta.red_offset = header.readUInt32LE(offset)
    offset += 4
    meta.red_length = header.readUInt32LE(offset)
    offset += 4
    meta.blue_offset = header.readUInt32LE(offset)
    offset += 4
    meta.blue_length = header.readUInt32LE(offset)
    offset += 4
    meta.green_offset = header.readUInt32LE(offset)
    offset += 4
    meta.green_length = header.readUInt32LE(offset)
    offset += 4
    meta.alpha_offset = header.readUInt32LE(offset)
    offset += 4
    meta.alpha_length = header.readUInt32LE(offset)
    meta.format = meta.blue_offset === 0 ? 'bgr' : 'rgb'
    if ((meta.bpp === 32) || meta.alpha_length) { meta.format += 'a' }
    return meta
  }
}

module.exports = FrameBufferCommand
