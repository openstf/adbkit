/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const Stream = require('stream');

class PullTransfer extends Stream.PassThrough {
  constructor() {
    {
      // Hack: trick Babel/TypeScript into allowing this before super.
      if (false) { super(); }
      let thisFn = (() => { return this; }).toString();
      let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
      eval(`${thisName} = this;`);
    }
    this.stats =
      {bytesTransferred: 0};
    super();
  }

  cancel() {
    return this.emit('cancel');
  }

  write(chunk, encoding, callback) {
    this.stats.bytesTransferred += chunk.length;
    this.emit('progress', this.stats);
    return super.write(chunk, encoding, callback);
  }
}

module.exports = PullTransfer;
