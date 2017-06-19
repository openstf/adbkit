/* eslint-disable
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
const crypto = require('crypto')
const {EventEmitter} = require('events')

const Promise = require('bluebird')
const Forge = require('node-forge')
const debug = require('debug')('adb:tcpusb:socket')

const Parser = require('../parser')
const Protocol = require('../protocol')
const Auth = require('../auth')
const Packet = require('./packet')
const PacketReader = require('./packetreader')
const Service = require('./service')
const ServiceMap = require('./servicemap')
const RollingCounter = require('./rollingcounter')

var Socket = (function() {
  let UINT32_MAX = undefined
  let UINT16_MAX = undefined
  let AUTH_TOKEN = undefined
  let AUTH_SIGNATURE = undefined
  let AUTH_RSAPUBLICKEY = undefined
  let TOKEN_LENGTH = undefined
  Socket = class Socket extends EventEmitter {
    static initClass() {
      UINT32_MAX = 0xFFFFFFFF
      UINT16_MAX = 0xFFFF
  
      AUTH_TOKEN = 1
      AUTH_SIGNATURE = 2
      AUTH_RSAPUBLICKEY = 3
  
      TOKEN_LENGTH = 20
    }

    constructor(client, serial, socket, options = {}) {
      super()
      this.client = client
      this.serial = serial
      this.socket = socket
      this.options = options
      if (!this.options.auth) { this.options.auth = Promise.resolve(true) }
      this.ended = false
      this.socket.setNoDelay(true)
      this.reader = new PacketReader(this.socket)
        .on('packet', this._handle.bind(this))
        .on('error', err => {
          debug(`PacketReader error: ${err.message}`)
          return this.end()
        }).on('end', this.end.bind(this))
      this.version = 1
      this.maxPayload = 4096
      this.authorized = false
      this.syncToken = new RollingCounter(UINT32_MAX)
      this.remoteId = new RollingCounter(UINT32_MAX)
      this.services = new ServiceMap
      this.remoteAddress = this.socket.remoteAddress
      this.token = null
      this.signature = null
    }

    end() {
      if (this.ended) { return this }
      // End services first so that they can send a final payload before FIN.
      this.services.end()
      this.socket.end()
      this.ended = true
      this.emit('end')
      return this
    }

    _error(err) {
      this.emit('error', err)
      return this.end()
    }

    _handle(packet) {
      if (this.ended) { return }
      this.emit('userActivity', packet)
      return Promise.try(() => {
        switch (packet.command) {
        case Packet.A_SYNC:
          return this._handleSyncPacket(packet)
        case Packet.A_CNXN:
          return this._handleConnectionPacket(packet)
        case Packet.A_OPEN:
          return this._handleOpenPacket(packet)
        case Packet.A_OKAY: case Packet.A_WRTE: case Packet.A_CLSE:
          return this._forwardServicePacket(packet)
        case Packet.A_AUTH:
          return this._handleAuthPacket(packet)
        default:
          throw new Error(`Unknown command ${packet.command}`)
        }
      }).catch(Socket.AuthError, () => {
        return this.end()
      }).catch(Socket.UnauthorizedError, () => {
        return this.end()
      }).catch(err => {
        return this._error(err)
      })
    }

    _handleSyncPacket(packet) {
      // No need to do anything?
      debug('I:A_SYNC')
      debug('O:A_SYNC')
      return this.write(Packet.assemble(Packet.A_SYNC, 1, this.syncToken.next(), null))
    }

    _handleConnectionPacket(packet) {
      debug('I:A_CNXN', packet)
      const version = Packet.swap32(packet.arg0)
      this.maxPayload = Math.min(UINT16_MAX, packet.arg1)
      return this._createToken()
        .then(token => {
          this.token = token
          debug(`Created challenge '${this.token.toString('base64')}'`)
          debug('O:A_AUTH')
          return this.write(Packet.assemble(Packet.A_AUTH, AUTH_TOKEN, 0, this.token))
        })
    }

    _handleAuthPacket(packet) {
      debug('I:A_AUTH', packet)
      switch (packet.arg0) {
      case AUTH_SIGNATURE:
        // Store first signature, ignore the rest
        debug(`Received signature '${packet.data.toString('base64')}'`)
        if (!this.signature) { this.signature = packet.data }
        debug('O:A_AUTH')
        return this.write(Packet.assemble(Packet.A_AUTH, AUTH_TOKEN, 0, this.token))
      case AUTH_RSAPUBLICKEY:
        if (!this.signature) {
          throw new Socket.AuthError('Public key sent before signature')
        }
        if (!packet.data || !(packet.data.length >= 2)) {
          throw new Socket.AuthError('Empty RSA public key')
        }
        debug(`Received RSA public key '${packet.data.toString('base64')}'`)
        return Auth.parsePublicKey(this._skipNull(packet.data))
          .then(key => {
            const digest = this.token.toString('binary')
            const sig = this.signature.toString('binary')
            if (!key.verify(digest, sig)) {
              debug('Signature mismatch')
              throw new Socket.AuthError('Signature mismatch')
            }
            debug('Signature verified')
            return key
          }).then(key => {
            return this.options.auth(key)
              .catch(function(err) {
                debug('Connection rejected by user-defined auth handler')
                throw new Socket.AuthError('Rejected by user-defined handler')
              })
          }).then(() => {
            return this._deviceId()
          }).then(id => {
            this.authorized = true
            debug('O:A_CNXN')
            return this.write(Packet.assemble(Packet.A_CNXN,
              Packet.swap32(this.version), this.maxPayload, id)
            )
          })
      default:
        throw new Error(`Unknown authentication method ${packet.arg0}`)
      }
    }

    _handleOpenPacket(packet) {
      if (!this.authorized) { throw new Socket.UnauthorizedError() }
      const remoteId = packet.arg0
      const localId = this.remoteId.next()
      if (!packet.data || !(packet.data.length >= 2)) {
        throw new Error('Empty service name')
      }
      const name = this._skipNull(packet.data)
      debug(`Calling ${name}`)
      const service = new Service(this.client, this.serial, localId, remoteId, this)
      return new Promise((resolve, reject) => {
        service.on('error', reject)
        service.on('end', resolve)
        this.services.insert(localId, service)
        debug(`Handling ${this.services.count} services simultaneously`)
        return service.handle(packet)
      }).catch(err => true).finally(() => {
        this.services.remove(localId)
        debug(`Handling ${this.services.count} services simultaneously`)
        return service.end()
      })
    }

    _forwardServicePacket(packet) {
      let service
      if (!this.authorized) { throw new Socket.UnauthorizedError() }
      const remoteId = packet.arg0
      const localId = packet.arg1
      if ((service = this.services.get(localId))) {
        return service.handle(packet)
      } else {
        return debug('Received a packet to a service that may have been closed already')
      }
    }

    write(chunk) {
      if (this.ended) { return }
      return this.socket.write(chunk)
    }

    _createToken() {
      return Promise.promisify(crypto.randomBytes)(TOKEN_LENGTH)
    }

    _skipNull(data) {
      return data.slice(0, -1) // Discard null byte at end
    }

    _deviceId() {
      debug('Loading device properties to form a standard device ID')
      return this.client.getProperties(this.serial)
        .then(function(properties) {
          const id = (([
            'ro.product.name',
            'ro.product.model',
            'ro.product.device'
          ]).map((prop) => `${prop}=${properties[prop]};`)).join('')
          return new Buffer(`device::${id}\0`)
        })
    }
  }
  Socket.initClass()
  return Socket
})()

Socket.AuthError = class AuthError extends Error {
  constructor(message) {
    super() // TODO check sanity
    Error.call(this)
    this.name = 'AuthError'
    this.message = message
    Error.captureStackTrace(this, Socket.AuthError)
  }
}

Socket.UnauthorizedError = class UnauthorizedError extends Error {
  constructor() {
    super() // TODO check sanity
    Error.call(this)
    this.name = 'UnauthorizedError'
    this.message = 'Unauthorized access'
    Error.captureStackTrace(this, Socket.UnauthorizedError)
  }
}

module.exports = Socket
