Fs = require 'fs'
Stream = require 'stream'
Promise = require 'bluebird'
Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect, assert} = Chai

Adb = require '../../src/adb'
Sync = require '../../src/adb/sync'
Stats = require '../../src/adb/sync/stats'
Entry = require '../../src/adb/sync/entry'
PushTransfer = require '../../src/adb/sync/pushtransfer'
PullTransfer = require '../../src/adb/sync/pulltransfer'
MockConnection = require '../mock/connection'

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

    promises = deviceList.map (device) ->
      client.syncService device.id
        .then (sync) ->
          expect(sync).to.be.an.instanceof Sync
          Promise.cast iterator sync
            .finally ->
              sync.end()

    Promise.all promises
      .then ->
        done()
      .catch done

  before (done) ->
    client = Adb.createClient()
    client.listDevices()
      .then (devices) ->
        deviceList = devices
        done()

  describe 'end()', ->

    it "should end the sync connection", ->
      conn = new MockConnection
      sync = new Sync conn
      Sinon.stub conn, 'end'
      sync.end()
      expect(conn.end).to.have.been.called

  describe 'push(contents, path[, mode])', ->

    it "should call pushStream when contents is a Stream", ->
      conn = new MockConnection
      sync = new Sync conn
      stream = new Stream.PassThrough
      Sinon.stub sync, 'pushStream'
      sync.push stream, 'foo'
      expect(sync.pushStream).to.have.been.called

    it "should call pushFile when contents is a String", ->
      conn = new MockConnection
      sync = new Sync conn
      stream = new Stream.PassThrough
      Sinon.stub sync, 'pushFile'
      sync.push __filename, 'foo'
      expect(sync.pushFile).to.have.been.called

    it "should return a PushTransfer instance", ->
      conn = new MockConnection
      sync = new Sync conn
      stream = new Stream.PassThrough
      transfer = sync.push stream, 'foo'
      expect(transfer).to.be.an.instanceof PushTransfer
      transfer.cancel()

  describe 'pushStream(stream, path[, mode])', ->

    it "should return a PushTransfer instance", ->
      conn = new MockConnection
      sync = new Sync conn
      stream = new Stream.PassThrough
      transfer = sync.pushStream stream, 'foo'
      expect(transfer).to.be.an.instanceof PushTransfer
      transfer.cancel()

    it "should be able to push >65536 byte chunks without error", (done) ->
      forEachSyncDevice (sync) ->
        new Promise (resolve, reject) ->
          stream = new Stream.PassThrough
          content = new Buffer 1000000
          transfer = sync.pushStream stream, SURELY_WRITABLE_FILE
          transfer.on 'error', reject
          transfer.on 'end', resolve
          stream.write content
          stream.end()
      , done

  describe 'pull(path)', ->

    it "should retrieve the same content pushStream() pushed", (done) ->
      forEachSyncDevice (sync) ->
        new Promise (resolve, reject) ->
          stream = new Stream.PassThrough
          content = 'ABCDEFGHI' + Date.now()
          transfer = sync.pushStream stream, SURELY_WRITABLE_FILE
          expect(transfer).to.be.an.instanceof PushTransfer
          transfer.on 'error', reject
          transfer.on 'end', ->
            transfer = sync.pull SURELY_WRITABLE_FILE
            expect(transfer).to.be.an.instanceof PullTransfer
            transfer.on 'error', reject
            transfer.on 'readable', ->
              while chunk = transfer.read()
                expect(chunk).to.not.be.null
                expect(chunk.toString()).to.equal content
                return resolve()
          stream.write content
          stream.end()
      , done

    it "should emit error for non-existing files", (done) ->
      forEachSyncDevice (sync) ->
        new Promise (resolve, reject) ->
          transfer = sync.pull SURELY_NONEXISTING_PATH
          transfer.on 'error', resolve
      , done

    it "should return a PullTransfer instance", (done) ->
      forEachSyncDevice (sync) ->
        rval = sync.pull SURELY_EXISTING_FILE
        expect(rval).to.be.an.instanceof PullTransfer
        rval.cancel()
      , done

    describe 'Stream', ->

      it "should emit 'end' when pull is done", (done) ->
        forEachSyncDevice (sync) ->
          new Promise (resolve, reject) ->
            transfer = sync.pull SURELY_EXISTING_FILE
            transfer.on 'error', reject
            transfer.on 'end', resolve
            transfer.resume()
        , done

  describe 'stat(path)', ->

    it "should return a Promise", (done) ->
      forEachSyncDevice (sync) ->
        rval = sync.stat SURELY_EXISTING_PATH
        expect(rval).to.be.an.instanceof Promise
        rval
      , done

    it "should call with an ENOENT error if the path does not exist", (done) ->
      forEachSyncDevice (sync) ->
        sync.stat SURELY_NONEXISTING_PATH
          .then (stats) ->
            throw new Error 'Should not reach success branch'
          .catch (err) ->
            expect(err).to.be.an.instanceof Error
            expect(err.code).to.equal 'ENOENT'
            expect(err.errno).to.equal 34
            expect(err.path).to.equal SURELY_NONEXISTING_PATH
      , done

    it "should call with an fs.Stats instance for an existing path", (done) ->
      forEachSyncDevice (sync) ->
        sync.stat SURELY_EXISTING_PATH
          .then (stats) ->
            expect(stats).to.be.an.instanceof Fs.Stats
      , done

    describe 'Stats', ->

      it "should implement Fs.Stats", (done) ->
        expect(new Stats 0, 0, 0).to.be.an.instanceof Fs.Stats
        done()

      it "should set the `.mode` property for isFile() etc", (done) ->
        forEachSyncDevice (sync) ->
          sync.stat SURELY_EXISTING_FILE
            .then (stats) ->
              expect(stats).to.be.an.instanceof Fs.Stats
              expect(stats.mode).to.be.above 0
              expect(stats.isFile()).to.be.true
              expect(stats.isDirectory()).to.be.false
        , done

      it "should set the `.size` property", (done) ->
        forEachSyncDevice (sync) ->
          sync.stat SURELY_EXISTING_FILE
            .then (stats) ->
              expect(stats).to.be.an.instanceof Fs.Stats
              expect(stats.isFile()).to.be.true
              expect(stats.size).to.be.above 0
        , done

      it "should set the `.mtime` property", (done) ->
        forEachSyncDevice (sync) ->
          sync.stat SURELY_EXISTING_FILE
            .then (stats) ->
              expect(stats).to.be.an.instanceof Fs.Stats
              expect(stats.mtime).to.be.an.instanceof Date
        , done

    describe 'Entry', ->

      it "should implement Stats", (done) ->
        expect(new Entry 'foo', 0, 0, 0).to.be.an.instanceof Stats
        done()

      it "should set the `.name` property", (done) ->
        forEachSyncDevice (sync) ->
          sync.readdir SURELY_EXISTING_PATH
            .then (files) ->
              expect(files).to.be.an 'Array'
              files.forEach (file) ->
                expect(file.name).to.not.be.null
                expect(file).to.be.an.instanceof Entry
        , done

      it "should set the Stats properties", (done) ->
        forEachSyncDevice (sync) ->
          sync.readdir SURELY_EXISTING_PATH
            .then (files) ->
              expect(files).to.be.an 'Array'
              files.forEach (file) ->
                expect(file.mode).to.not.be.null
                expect(file.size).to.not.be.null
                expect(file.mtime).to.not.be.null
        , done
