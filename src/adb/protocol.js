/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
class Protocol {
  static initClass() {
    this.OKAY = 'OKAY';
    this.FAIL = 'FAIL';
    this.STAT = 'STAT';
    this.LIST = 'LIST';
    this.DENT = 'DENT';
    this.RECV = 'RECV';
    this.DATA = 'DATA';
    this.DONE = 'DONE';
    this.SEND = 'SEND';
    this.QUIT = 'QUIT';
  }

  static decodeLength(length) {
    return parseInt(length, 16);
  }

  static encodeLength(length) {
    return ('0000' + length.toString(16)).slice(-4).toUpperCase();
  }

  static encodeData(data) {
    if (!Buffer.isBuffer(data)) {
      data = new Buffer(data);
    }
    return Buffer.concat([new Buffer(Protocol.encodeLength(data.length)), data]);
  }
}
Protocol.initClass();

module.exports = Protocol;
