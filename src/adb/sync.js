/* eslint-disable
    no-cond-assign,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
const Fs = require('fs')
const Path = require('path')
const Promise = require('bluebird')
const {EventEmitter} = require('events')
const debug = require('debug')('adb:sync')

const Parser = require('./parser')
const Protocol = require('./protocol')
const Stats = require('./sync/stats')
const Entry = require('./sync/entry')
const PushTransfer = require('./sync/pushtransfer')
const PullTransfer = require('./sync/pulltransfer')

var Sync = (function() {
  let TEMP_PATH = undefined
  let DEFAULT_CHMOD = undefined
  let DATA_MAX_LENGTH = undefined
  Sync = class Sync extends EventEmitter {
    static initClass() {
      TEMP_PATH = '/data/local/tmp'
      DEFAULT_CHMOD = 0o644
      DATA_MAX_LENGTH = 65536
    }

    static temp(path) {
      return `${TEMP_PATH}/${Path.basename(path)}`
    }

    constructor(connection) {
      super()
      this.connection = connection
      this.parser = this.connection.parser
    }

    stat(path, callback) {
      this._sendCommandWithArg(Protocol.STAT, path)
      return this.parser.readAscii(4)
        .then(reply => {
          switch (reply) {
          case Protocol.STAT:
            return this.parser.readBytes(12)
              .then(stat => {
                const mode = stat.readUInt32LE(0)
                const size = stat.readUInt32LE(4)
                const mtime = stat.readUInt32LE(8)
                if (mode === 0) {
                  return this._enoent(path)
                } else {
                  return new Stats(mode, size, mtime)
                }
              })
          case Protocol.FAIL:
            return this._readError()
          default:
            return this.parser.unexpected(reply, 'STAT or FAIL')
          }
        }).nodeify(callback)
    }

    readdir(path, callback) {
      const files = []

      var readNext = () => {
        return this.parser.readAscii(4)
          .then(reply => {
            switch (reply) {
            case Protocol.DENT:
              return this.parser.readBytes(16)
                .then(stat => {
                  const mode = stat.readUInt32LE(0)
                  const size = stat.readUInt32LE(4)
                  const mtime = stat.readUInt32LE(8)
                  const namelen = stat.readUInt32LE(12)
                  return this.parser.readBytes(namelen)
                    .then(function(name) {
                      name = name.toString()
                      // Skip '.' and '..' to match Node's fs.readdir().
                      if ((name !== '.') && (name !== '..')) {
                        files.push(new Entry(name, mode, size, mtime))
                      }
                      return readNext()
                    })
                })
            case Protocol.DONE:
              return this.parser.readBytes(16)
                .then(zero => files)
            case Protocol.FAIL:
              return this._readError()
            default:
              return this.parser.unexpected(reply, 'DENT, DONE or FAIL')
            }
          })
      }

      this._sendCommandWithArg(Protocol.LIST, path)

      return readNext()
        .nodeify(callback)
    }

    push(contents, path, mode) {
      if (typeof contents === 'string') {
        return this.pushFile(contents, path, mode)
      } else {
        return this.pushStream(contents, path, mode)
      }
    }

    pushFile(file, path, mode = DEFAULT_CHMOD) {
      if (!mode) { mode = DEFAULT_CHMOD }
      return this.pushStream(Fs.createReadStream(file), path, mode)
    }

    pushStream(stream, path, mode = DEFAULT_CHMOD) {
      mode |= Stats.S_IFREG
      this._sendCommandWithArg(Protocol.SEND, `${path},${mode}`)
      return this._writeData(stream, Math.floor(Date.now() / 1000))
    }

    pull(path) {
      this._sendCommandWithArg(Protocol.RECV, `${path}`)
      return this._readData()
    }

    end() {
      this.connection.end()
      return this
    }

    tempFile(path) {
      return Sync.temp(path)
    }

    _writeData(stream, timeStamp) {
      let writer
      const transfer = new PushTransfer

      const writeData = () => {
        let endListener, errorListener, readableListener
        let resolver = Promise.defer()
        writer = Promise.resolve()
          .cancellable()

        stream.on('end', (endListener = () => {
          return writer.then(() => {
            this._sendCommandWithLength(Protocol.DONE, timeStamp)
            return resolver.resolve()
          })
        })
        )

        const waitForDrain = () => {
          let drainListener
          resolver = Promise.defer()

          this.connection.on('drain', (drainListener = () => resolver.resolve())
          )

          return resolver.promise.finally(() => {
            return this.connection.removeListener('drain', drainListener)
          })
        }

        const track = () => transfer.pop()

        var writeNext = () => {
          let chunk
          if (chunk = stream.read(DATA_MAX_LENGTH) || stream.read()) {
            this._sendCommandWithLength(Protocol.DATA, chunk.length)
            transfer.push(chunk.length)
            if (this.connection.write(chunk, track)) {
              return writeNext()
            } else {
              return waitForDrain()
                .then(writeNext)
            }
          } else {
            return Promise.resolve()
          }
        }

        stream.on('readable', (readableListener = () => writer.then(writeNext))
        )

        stream.on('error', (errorListener = err => resolver.reject(err))
        )

        return resolver.promise.finally(function() {
          stream.removeListener('end', endListener)
          stream.removeListener('readable', readableListener)
          stream.removeListener('error', errorListener)
          return writer.cancel()
        })
      }

      const readReply = () => {
        return this.parser.readAscii(4)
          .then(reply => {
            switch (reply) {
            case Protocol.OKAY:
              return this.parser.readBytes(4)
                .then(zero => true)
            case Protocol.FAIL:
              return this._readError()
            default:
              return this.parser.unexpected(reply, 'OKAY or FAIL')
            }
          })
      }

      // While I can't think of a case that would break this double-Promise
      // writer-reader arrangement right now, it's not immediately obvious
      // that the code is correct and it may or may not have some failing
      // edge cases. Refactor pending.

      writer = writeData()
        .cancellable()
        .catch(Promise.CancellationError, err => {
          return this.connection.end()
        }).catch(function(err) {
          transfer.emit('error', err)
          return reader.cancel()
        })

      var reader = readReply()
        .cancellable()
        .catch(Promise.CancellationError, err => true).catch(function(err) {
          transfer.emit('error', err)
          return writer.cancel()}).finally(() => transfer.end())

      transfer.on('cancel', function() {
        writer.cancel()
        return reader.cancel()
      })

      return transfer
    }

    _readData() {
      let cancelListener
      const transfer = new PullTransfer

      var readNext = () => {
        return this.parser.readAscii(4)
          .cancellable()
          .then(reply => {
            switch (reply) {
            case Protocol.DATA:
              return this.parser.readBytes(4)
                .then(lengthData => {
                  const length = lengthData.readUInt32LE(0)
                  return this.parser.readByteFlow(length, transfer)
                    .then(readNext)
                })
            case Protocol.DONE:
              return this.parser.readBytes(4)
                .then(zero => true)
            case Protocol.FAIL:
              return this._readError()
            default:
              return this.parser.unexpected(reply, 'DATA, DONE or FAIL')
            }
          })
      }

      const reader = readNext()
        .catch(Promise.CancellationError, err => {
          return this.connection.end()
        }).catch(err => transfer.emit('error', err)).finally(function() {
          transfer.removeListener('cancel', cancelListener)
          return transfer.end()
        })

      transfer.on('cancel', (cancelListener = () => reader.cancel())
      )

      return transfer
    }

    _readError() {
      return this.parser.readBytes(4)
        .then(length => {
          return this.parser.readBytes(length.readUInt32LE(0))
            .then(buf => Promise.reject(new Parser.FailError(buf.toString())))
        }).finally(() => {
          return this.parser.end()
        })
    }

    _sendCommandWithLength(cmd, length) {
      if (cmd !== Protocol.DATA) { debug(cmd) }
      const payload = new Buffer(cmd.length + 4)
      payload.write(cmd, 0, cmd.length)
      payload.writeUInt32LE(length, cmd.length)
      return this.connection.write(payload)
    }

    _sendCommandWithArg(cmd, arg) {
      debug(`${cmd} ${arg}`)
      const payload = new Buffer(cmd.length + 4 + arg.length)
      let pos = 0
      payload.write(cmd, pos, cmd.length)
      pos += cmd.length
      payload.writeUInt32LE(arg.length, pos)
      pos += 4
      payload.write(arg, pos)
      return this.connection.write(payload)
    }

    _enoent(path) {
      const err = new Error(`ENOENT, no such file or directory '${path}'`)
      err.errno = 34
      err.code = 'ENOENT'
      err.path = path
      return Promise.reject(err)
    }
  }
  Sync.initClass()
  return Sync
})()

module.exports = Sync
