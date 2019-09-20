var MockDuplex, Stream,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Stream = require('stream');

MockDuplex = (function(superClass) {
  extend(MockDuplex, superClass);

  function MockDuplex() {
    return MockDuplex.__super__.constructor.apply(this, arguments);
  }

  MockDuplex.prototype._read = function(size) {};

  MockDuplex.prototype._write = function(chunk, encoding, callback) {
    this.emit('write', chunk, encoding, callback);
    callback(null);
  };

  MockDuplex.prototype.causeRead = function(chunk) {
    if (!Buffer.isBuffer(chunk)) {
      chunk = new Buffer(chunk);
    }
    this.push(chunk);
  };

  MockDuplex.prototype.causeEnd = function() {
    this.push(null);
  };

  MockDuplex.prototype.end = function() {
    this.causeEnd();
    return Stream.Duplex.prototype.end.apply(this, arguments);
  };

  return MockDuplex;

})(Stream.Duplex);

module.exports = MockDuplex;
