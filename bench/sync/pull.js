var Adb, Bench, deviceId, spawn;

Bench = require('bench');

spawn = require('child_process').spawn;

Adb = require('../..');

deviceId = process.env.DEVICE_ID;

module.exports = {
  compareCount: 3,
  compare: {
    "pull /dev/graphics/fb0 using ADB CLI": function(done) {
      var proc;
      proc = spawn('adb', ['-s', deviceId, 'pull', '/dev/graphics/fb0', '/dev/null']);
      return proc.stdout.on('end', done);
    },
    "pull /dev/graphics/fb0 using client.pull()": function(done) {
      var client;
      client = Adb.createClient();
      return client.pull(deviceId, '/dev/graphics/fb0', function(err, stream) {
        stream.resume();
        return stream.on('end', done);
      });
    }
  }
};

Bench.runMain();
