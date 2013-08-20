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
    "pull /dev/graphics/fb0 using pullFileStream()": (done) ->
      client = Adb.createClient()
      client.syncService deviceId, (err, sync) ->
        sync.pullFileStream '/dev/graphics/fb0', (err, stream) ->
          stream.on 'end', ->
            sync.end()
            done()
          stream.resume()

Bench.runMain()
