var Command, ConnectCommand, Protocol,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Command = require('../../command');

Protocol = require('../../protocol');

ConnectCommand = (function(superClass) {
  var RE_OK;

  extend(ConnectCommand, superClass);

  function ConnectCommand() {
    return ConnectCommand.__super__.constructor.apply(this, arguments);
  }

  RE_OK = /connected to|already connected/;

  ConnectCommand.prototype.execute = function(host, port) {
    this._send("host:connect:" + host + ":" + port);
    return this.parser.readAscii(4).then((function(_this) {
      return function(reply) {
        switch (reply) {
          case Protocol.OKAY:
            return _this.parser.readValue().then(function(value) {
              if (RE_OK.test(value)) {
                return host + ":" + port;
              } else {
                throw new Error(value.toString());
              }
            });
          case Protocol.FAIL:
            return _this.parser.readError();
          default:
            return _this.parser.unexpected(reply, 'OKAY or FAIL');
        }
      };
    })(this));
  };

  return ConnectCommand;

})(Command);

module.exports = ConnectCommand;
