/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const Bench = require('bench');
const {spawn} = require('child_process');

const Adb = require('../..');

const deviceId = process.env.DEVICE_ID;

module.exports = {
  compareCount: 3,
  compare: {
    "pull /dev/graphics/fb0 using ADB CLI"(done) {
      const proc = spawn('adb',
        ['-s', deviceId, 'pull', '/dev/graphics/fb0', '/dev/null']);
      return proc.stdout.on('end', done);
    },
    "pull /dev/graphics/fb0 using client.pull()"(done) {
      const client = Adb.createClient();
      return client.pull(deviceId, '/dev/graphics/fb0', function(err, stream) {
        stream.resume();
        return stream.on('end', done);
      });
    }
  }
};

Bench.runMain();
