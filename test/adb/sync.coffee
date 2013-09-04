Fs = require 'fs'
Stream = require 'stream'
Async = require 'async'
Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect, assert} = Chai

Adb = require '../../'
Sync = require '../../src/adb/sync'
PushTransfer= require '../../src/adb/sync/pushtransfer'
PullTransfer = require '../../src/adb/sync/pulltransfer'

# This test suite is a bit special in that it requires a connected Android
# device (or many devices). All will be tested.
describe 'Sync', ->

  SURELY_EXISTING_FILE = '/system/build.prop'
  SURELY_EXISTING_PATH = '/'
  SURELY_NONEXISTING_PATH = '/non-existing-path'
  SURELY_WRITABLE_FILE = '/data/local/tmp/_sync.test'

  client = null
  deviceList = null

  forEachSyncDevice = (iterator, done) ->
    assert deviceList.length > 0,
      'At least one connected Android device is required'
    Async.each deviceList, (device, callback) ->
      client.syncService device.id, (err, sync) ->
        expect(err).to.be.null
        expect(sync).to.be.an.instanceof Sync
        iterator sync, (err) ->
          sync.end()
          callback err
    , done

  before (done) ->
    client = Adb.createClient()
    client.listDevices (err, devices) ->
      deviceList = devices
      done err

  describe 'end()', ->

    it "should end the sync connection", (done) ->
      forEachSyncDevice (sync, callback) ->
        sync.connection.on 'end', ->
          callback()
        sync.end()
      , done

  describe 'push(contents, path[, mode][, callback])', ->

    it "should call pushStream when contents is a Stream", (done) ->
      forEachSyncDevice (sync, callback) ->
        stream = new Stream.PassThrough
        spy = Sinon.spy sync, 'pushStream'
        sync.push stream, SURELY_WRITABLE_FILE, ->
        expect(spy).to.have.been.called
        callback()
      , done

    it "should call pushFile when contents is a String", (done) ->
      forEachSyncDevice (sync, callback) ->
        spy = Sinon.spy sync, 'pushFile'
        transfer = sync.push 'foo.bar', SURELY_WRITABLE_FILE, ->
        transfer.on 'error', ->
        expect(spy).to.have.been.called
        callback()
      , done

    it "should return a PushTransfer instance", (done) ->
      forEachSyncDevice (sync, callback) ->
        stream = new Stream.PassThrough
        rval = sync.push stream, SURELY_WRITABLE_FILE, ->
        expect(rval).to.be.an.instanceof PushTransfer
        callback()
      , done

  describe 'pushStream(stream, path[, mode][, callback])', ->

    it "should call the callback when done pushing", (done) ->
      forEachSyncDevice (sync, callback) ->
        stream = new Stream.PassThrough
        sync.pushStream stream, SURELY_WRITABLE_FILE, (err) ->
          expect(err).to.be.null
          callback()
        stream.write 'FOO'
        stream.end()
      , done

    it "should return a PushTransfer instance", (done) ->
      forEachSyncDevice (sync, callback) ->
        stream = new Stream.PassThrough
        rval = sync.pushStream stream, SURELY_WRITABLE_FILE, ->
        expect(rval).to.be.an.instanceof PushTransfer
        callback()
      , done

    it "should be able to push >65536 byte chunks without error", (done) ->
      forEachSyncDevice (sync, callback) ->
        stream = new Stream.PassThrough
        content = new Buffer 1000000
        sync.pushStream stream, SURELY_WRITABLE_FILE, (err) ->
          throw err if err
          callback()
        stream.write content
        stream.end()
      , done

  describe 'pull(path, callback)', ->

    it "should retrieve the same content pushStream() pushed", (done) ->
      forEachSyncDevice (sync, callback) ->
        stream = new Stream.PassThrough
        content = 'ABCDEFGHI'
        sync.pushStream stream, SURELY_WRITABLE_FILE, (err, transfer) ->
          expect(err).to.be.null
          expect(transfer).to.be.an.instanceof PushTransfer
          transfer.on 'end', ->
            sync.pull SURELY_WRITABLE_FILE, (err, transfer) ->
              expect(err).to.be.null
              expect(transfer).to.be.an.instanceof PullTransfer
              transfer.on 'readable', ->
                expect(transfer.read().toString()).to.equal content
                callback()
        stream.write content
        stream.end()
      , done

    it "should return a PullTransfer instance", (done) ->
      forEachSyncDevice (sync, callback) ->
        rval = sync.pull SURELY_EXISTING_FILE, ->
        expect(rval).to.be.an.instanceof PullTransfer
        callback()
      , done

    describe 'Stream', ->

      it "should emit 'end' when pull is done", (done) ->
        forEachSyncDevice (sync, callback) ->
          sync.pull SURELY_EXISTING_FILE, (err, out) ->
            expect(err).to.be.null
            out.on 'end', callback
            out.resume()
        , done

  describe 'stat(path, callback)', ->

    it "should return the Sync instance for chaining", (done) ->
      forEachSyncDevice (sync, callback) ->
        rval = sync.stat SURELY_EXISTING_PATH, ->
        expect(rval).to.be.an.instanceof Sync
        callback()
      , done

    it "should call with an ENOENT error if the path does not exist", (done) ->
      forEachSyncDevice (sync, callback) ->
        sync.stat SURELY_NONEXISTING_PATH, (err, stats) ->
          expect(err).to.be.an.instanceof Error
          expect(err.code).to.equal 'ENOENT'
          expect(err.errno).to.equal 34
          expect(err.path).to.equal
          expect(stats).to.be.undefined
          callback()
      , done

    it "should call with an fs.Stats instance for an existing path", (done) ->
      forEachSyncDevice (sync, callback) ->
        sync.stat SURELY_EXISTING_PATH, (err, stats) ->
          expect(err).to.be.null
          expect(stats).to.be.an.instanceof Fs.Stats
          callback()
      , done

    describe 'Stats', ->

      it "should set the `.mode` property for isFile() etc", (done) ->
        forEachSyncDevice (sync, callback) ->
          sync.stat SURELY_EXISTING_FILE, (err, stats) ->
            expect(err).to.be.null
            expect(stats).to.be.an.instanceof Fs.Stats
            expect(stats.mode).to.be.above 0
            expect(stats.isFile()).to.be.true
            expect(stats.isDirectory()).to.be.false
            callback()
        , done

      it "should set the `.size` property", (done) ->
        forEachSyncDevice (sync, callback) ->
          sync.stat SURELY_EXISTING_FILE, (err, stats) ->
            expect(err).to.be.null
            expect(stats).to.be.an.instanceof Fs.Stats
            expect(stats.isFile()).to.be.true
            expect(stats.size).to.be.above 0
            callback()
        , done

      it "should set the `.mtime` property", (done) ->
        forEachSyncDevice (sync, callback) ->
          sync.stat SURELY_EXISTING_FILE, (err, stats) ->
            expect(err).to.be.null
            expect(stats).to.be.an.instanceof Fs.Stats
            expect(stats.mtime).to.be.an.instanceof Date
            callback()
        , done

