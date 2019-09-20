var MockConnection, MockDuplex, Parser;

Parser = require('../../src/adb/parser');

MockDuplex = require('./duplex');

MockConnection = (function() {
  function MockConnection() {
    this.socket = new MockDuplex;
    this.parser = new Parser(this.socket);
  }

  MockConnection.prototype.end = function() {
    this.socket.causeEnd();
    return this;
  };

  MockConnection.prototype.write = function() {
    this.socket.write.apply(this.socket, arguments);
    return this;
  };

  return MockConnection;

})();

module.exports = MockConnection;
