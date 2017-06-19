const Command = require('../../command');
const Protocol = require('../../protocol');
const Tracker = require('../../tracker');
const HostDevicesCommand = require('./devices');

class HostTrackDevicesCommand extends HostDevicesCommand {
  execute() {
    this._send('host:track-devices');
    return this.parser.readAscii(4)
      .then(reply => {
        switch (reply) {
          case Protocol.OKAY:
            return new Tracker(this);
          case Protocol.FAIL:
            return this.parser.readError();
          default:
            return this.parser.unexpected(reply, 'OKAY or FAIL');
        }
    });
  }
}

module.exports = HostTrackDevicesCommand;
