Bench = require 'bench'
{spawn} = require 'child_process'

Adb = require '../..'

deviceId = process.env.DEVICE_ID

module.exports =
  compareCount: 3
  compare:
    "pull /dev/graphics/fb0 using ADB CLI": (done) ->
      proc = spawn 'adb',
        ['-s', deviceId, 'pull', '/dev/graphics/fb0', '/dev/null']
      proc.stdout.on 'end', done
    "pull /dev/graphics/fb0 using client.pull()": (done) ->
      client = Adb.createClient()
      client.pull deviceId, '/dev/graphics/fb0', (err, stream) ->
        stream.resume()
        stream.on 'end', done

Bench.runMain()
