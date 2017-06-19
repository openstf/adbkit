// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const Net = require('net')
const debug = require('debug')('adb:connection')
const {EventEmitter} = require('events')
const {execFile} = require('child_process')

const Parser = require('./parser')
const dump = require('./dump')

class Connection extends EventEmitter {
  constructor(options) {
    super()
    this.options = options
    this.socket = null
    this.parser = null
    this.triedStarting = false
  }

  connect() {
    this.socket = Net.connect(this.options)
    this.socket.setNoDelay(true)
    this.parser = new Parser(this.socket)
    this.socket.on('connect', () => {
      return this.emit('connect')
    })
    this.socket.on('end', () => {
      return this.emit('end')
    })
    this.socket.on('drain', () => {
      return this.emit('drain')
    })
    this.socket.on('timeout', () => {
      return this.emit('timeout')
    })
    this.socket.on('error', err => {
      return this._handleError(err)
    })
    this.socket.on('close', hadError => {
      return this.emit('close', hadError)
    })
    return this
  }

  end() {
    this.socket.end()
    return this
  }

  write(data, callback) {
    this.socket.write(dump(data), callback)
    return this
  }

  startServer(callback) {
    debug(`Starting ADB server via '${this.options.bin} start-server'`)
    return this._exec(['start-server'], {}, callback)
  }

  _exec(args, options, callback) {
    debug(`CLI: ${this.options.bin} ${args.join(' ')}`)
    execFile(this.options.bin, args, options, callback)
    return this
  }

  _handleError(err) {
    if ((err.code === 'ECONNREFUSED') && !this.triedStarting) {
      debug('Connection was refused, let\'s try starting the server once')
      this.triedStarting = true
      this.startServer(err => {
        if (err) { return this._handleError(err) }
        return this.connect()
      })
    } else {
      debug(`Connection had an error: ${err.message}`)
      this.emit('error', err)
      this.end()
    }
  }
}

module.exports = Connection
