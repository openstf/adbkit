/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const {EventEmitter} = require('events');

const Packet = require('./packet');

class PacketReader extends EventEmitter {
  constructor(stream) {
    {
      // Hack: trick Babel/TypeScript into allowing this before super.
      if (false) { super(); }
      let thisFn = (() => { return this; }).toString();
      let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
      eval(`${thisName} = this;`);
    }
    this.stream = stream;
    super();
    this.inBody = false;
    this.buffer = null;
    this.packet = null;
    this.stream.on('readable', this._tryRead.bind(this));
    this.stream.on('error', err => this.emit('error', err));
    this.stream.on('end', () => this.emit('end'));
    setImmediate(this._tryRead.bind(this));
  }

  _tryRead() {
    while (this._appendChunk()) {
      while (this.buffer) {
        if (this.inBody) {
          if (!(this.buffer.length >= this.packet.length)) { break; }
          this.packet.data = this._consume(this.packet.length);
          if (!this.packet.verifyChecksum()) {
            this.emit('error', new PacketReader.ChecksumError(this.packet));
            return;
          }
          this.emit('packet', this.packet);
          this.inBody = false;
        } else {
          if (!(this.buffer.length >= 24)) { break; }
          const header = this._consume(24);
          this.packet = new Packet(
            header.readUInt32LE(0),
            header.readUInt32LE(4),
            header.readUInt32LE(8),
            header.readUInt32LE(12),
            header.readUInt32LE(16),
            header.readUInt32LE(20),
            new Buffer(0)
          );
          if (!this.packet.verifyMagic()) {
            this.emit('error', new PacketReader.MagicError(this.packet));
            return;
          }
          if (this.packet.length === 0) {
            this.emit('packet', this.packet);
          } else {
            this.inBody = true;
          }
        }
      }
    }
  }

  _appendChunk() {
    let chunk;
    if ((chunk = this.stream.read())) {
      if (this.buffer) {
        return this.buffer = Buffer.concat([this.buffer, chunk], this.buffer.length + chunk.length);
      } else {
        return this.buffer = chunk;
      }
    } else {
      return null;
    }
  }

  _consume(length) {
    const chunk = this.buffer.slice(0, length);
    this.buffer = length === this.buffer.length ? null : this.buffer.slice(length);
    return chunk;
  }
}

PacketReader.ChecksumError = class ChecksumError extends Error {
  constructor(packet) {
    {
      // Hack: trick Babel/TypeScript into allowing this before super.
      if (false) { super(); }
      let thisFn = (() => { return this; }).toString();
      let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
      eval(`${thisName} = this;`);
    }
    this.packet = packet;
    Error.call(this);
    this.name = 'ChecksumError';
    this.message = "Checksum mismatch";
    Error.captureStackTrace(this, PacketReader.ChecksumError);
  }
};

PacketReader.MagicError = class MagicError extends Error {
  constructor(packet) {
    {
      // Hack: trick Babel/TypeScript into allowing this before super.
      if (false) { super(); }
      let thisFn = (() => { return this; }).toString();
      let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
      eval(`${thisName} = this;`);
    }
    this.packet = packet;
    Error.call(this);
    this.name = 'MagicError';
    this.message = "Magic value mismatch";
    Error.captureStackTrace(this, PacketReader.MagicError);
  }
};

module.exports = PacketReader;
