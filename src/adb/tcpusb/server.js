/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const Net = require('net');
const {EventEmitter} = require('events');

const Socket = require('./socket');

class Server extends EventEmitter {
  constructor(client, serial, options) {
    {
      // Hack: trick Babel/TypeScript into allowing this before super.
      if (false) { super(); }
      let thisFn = (() => { return this; }).toString();
      let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
      eval(`${thisName} = this;`);
    }
    this.client = client;
    this.serial = serial;
    this.options = options;
    this.connections = [];
    this.server = Net.createServer({allowHalfOpen: true});
    this.server.on('error', err => {
      return this.emit('error', err);
    });
    this.server.on('listening', () => {
      return this.emit('listening');
    });
    this.server.on('close', () => {
      return this.emit('close');
    });
    this.server.on('connection', conn => {
      const socket = new Socket(this.client, this.serial, conn, this.options);
      this.connections.push(socket);
      socket.on('error', err => {
        // 'conn' is guaranteed to get ended
        return this.emit('error', err);
      });
      socket.once('end', () => {
        // 'conn' is guaranteed to get ended
        return this.connections = this.connections.filter(val => val !== socket);
      });
      return this.emit('connection', socket);
    });
  }

  listen() {
    this.server.listen.apply(this.server, arguments);
    return this;
  }

  close() {
    this.server.close();
    return this;
  }

  end() {
    for (let conn of Array.from(this.connections)) { conn.end(); }
    return this;
  }
}

module.exports = Server;
