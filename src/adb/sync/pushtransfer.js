/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const {EventEmitter} = require('events');

class PushTransfer extends EventEmitter {
  constructor() {
    {
      // Hack: trick Babel/TypeScript into allowing this before super.
      if (false) { super(); }
      let thisFn = (() => { return this; }).toString();
      let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
      eval(`${thisName} = this;`);
    }
    this._stack = [];
    this.stats =
      {bytesTransferred: 0};
  }

  cancel() {
    return this.emit('cancel');
  }

  push(byteCount) {
    return this._stack.push(byteCount);
  }

  pop() {
    const byteCount = this._stack.pop();
    this.stats.bytesTransferred += byteCount;
    return this.emit('progress', this.stats);
  }

  end() {
    return this.emit('end');
  }
}

module.exports = PushTransfer;
