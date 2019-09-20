/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const Fs = require('fs');
const Stream = require('stream');
const Promise = require('bluebird');
const Sinon = require('sinon');
const Chai = require('chai');
Chai.use(require('sinon-chai'));
const {expect, assert} = Chai;

const Adb = require('../../src/adb');
const Sync = require('../../src/adb/sync');
const Stats = require('../../src/adb/sync/stats');
const Entry = require('../../src/adb/sync/entry');
const PushTransfer = require('../../src/adb/sync/pushtransfer');
const PullTransfer = require('../../src/adb/sync/pulltransfer');
const MockConnection = require('../mock/connection');

// This test suite is a bit special in that it requires a connected Android
// device (or many devices). All will be tested.
describe('Sync', function() {
  // By default, skip tests that require a device.
  let dt = xit;
  if (process.env.RUN_DEVICE_TESTS) { dt = it; }

  const SURELY_EXISTING_FILE = '/system/build.prop';
  const SURELY_EXISTING_PATH = '/';
  const SURELY_NONEXISTING_PATH = '/non-existing-path';
  const SURELY_WRITABLE_FILE = '/data/local/tmp/_sync.test';

  let client = null;
  let deviceList = null;

  const forEachSyncDevice = function(iterator, done) {
    assert(deviceList.length > 0,
      'At least one connected Android device is required');

    const promises = deviceList.map(device => client.syncService(device.id)
      .then(function(sync) {
        expect(sync).to.be.an.instanceof(Sync);
        return Promise.cast(iterator(sync))
          .finally(() => sync.end());
    }));

    return Promise.all(promises)
      .then(() => done()).catch(done);
  };

  before(function(done) {
    client = Adb.createClient();
    return client.listDevices()
      .then(function(devices) {
        deviceList = devices;
        return done();
    });
  });

  describe('end()', () => it("should end the sync connection", function() {
    const conn = new MockConnection;
    const sync = new Sync(conn);
    Sinon.stub(conn, 'end');
    sync.end();
    return expect(conn.end).to.have.been.called;
  }));

  describe('push(contents, path[, mode])', function() {

    it("should call pushStream when contents is a Stream", function() {
      const conn = new MockConnection;
      const sync = new Sync(conn);
      const stream = new Stream.PassThrough;
      Sinon.stub(sync, 'pushStream');
      sync.push(stream, 'foo');
      return expect(sync.pushStream).to.have.been.called;
    });

    it("should call pushFile when contents is a String", function() {
      const conn = new MockConnection;
      const sync = new Sync(conn);
      const stream = new Stream.PassThrough;
      Sinon.stub(sync, 'pushFile');
      sync.push(__filename, 'foo');
      return expect(sync.pushFile).to.have.been.called;
    });

    return it("should return a PushTransfer instance", function() {
      const conn = new MockConnection;
      const sync = new Sync(conn);
      const stream = new Stream.PassThrough;
      const transfer = sync.push(stream, 'foo');
      expect(transfer).to.be.an.instanceof(PushTransfer);
      return transfer.cancel();
    });
  });

  describe('pushStream(stream, path[, mode])', function() {

    it("should return a PushTransfer instance", function() {
      const conn = new MockConnection;
      const sync = new Sync(conn);
      const stream = new Stream.PassThrough;
      const transfer = sync.pushStream(stream, 'foo');
      expect(transfer).to.be.an.instanceof(PushTransfer);
      return transfer.cancel();
    });

    return dt("should be able to push >65536 byte chunks without error", done => forEachSyncDevice(sync => new Promise(function(resolve, reject) {
      const stream = new Stream.PassThrough;
      const content = new Buffer(1000000);
      const transfer = sync.pushStream(stream, SURELY_WRITABLE_FILE);
      transfer.on('error', reject);
      transfer.on('end', resolve);
      stream.write(content);
      return stream.end();
    })
    , done));
  });

  describe('pull(path)', function() {

    dt("should retrieve the same content pushStream() pushed", done => forEachSyncDevice(sync => new Promise(function(resolve, reject) {
      const stream = new Stream.PassThrough;
      const content = 'ABCDEFGHI' + Date.now();
      let transfer = sync.pushStream(stream, SURELY_WRITABLE_FILE);
      expect(transfer).to.be.an.instanceof(PushTransfer);
      transfer.on('error', reject);
      transfer.on('end', function() {
        transfer = sync.pull(SURELY_WRITABLE_FILE);
        expect(transfer).to.be.an.instanceof(PullTransfer);
        transfer.on('error', reject);
        return transfer.on('readable', function() {
          let chunk;
          while ((chunk = transfer.read())) {
            expect(chunk).to.not.be.null;
            expect(chunk.toString()).to.equal(content);
            return resolve();
          }
        });
      });
      stream.write(content);
      return stream.end();
    })
    , done));

    dt("should emit error for non-existing files", done => forEachSyncDevice(sync => new Promise(function(resolve, reject) {
      const transfer = sync.pull(SURELY_NONEXISTING_PATH);
      return transfer.on('error', resolve);
    })
    , done));

    dt("should return a PullTransfer instance", done => forEachSyncDevice(function(sync) {
      const rval = sync.pull(SURELY_EXISTING_FILE);
      expect(rval).to.be.an.instanceof(PullTransfer);
      return rval.cancel();
    }
    , done));

    return describe('Stream', () => dt("should emit 'end' when pull is done", done => forEachSyncDevice(sync => new Promise(function(resolve, reject) {
      const transfer = sync.pull(SURELY_EXISTING_FILE);
      transfer.on('error', reject);
      transfer.on('end', resolve);
      return transfer.resume();
    })
    , done)));
  });

  return describe('stat(path)', function() {

    dt("should return a Promise", done => forEachSyncDevice(function(sync) {
      const rval = sync.stat(SURELY_EXISTING_PATH);
      expect(rval).to.be.an.instanceof(Promise);
      return rval;
    }
    , done));

    dt("should call with an ENOENT error if the path does not exist", done => forEachSyncDevice(sync => sync.stat(SURELY_NONEXISTING_PATH)
      .then(function(stats) {
        throw new Error('Should not reach success branch');}).catch(function(err) {
        expect(err).to.be.an.instanceof(Error);
        expect(err.code).to.equal('ENOENT');
        expect(err.errno).to.equal(34);
        return expect(err.path).to.equal(SURELY_NONEXISTING_PATH);
    })
    , done));

    dt("should call with an fs.Stats instance for an existing path", done => forEachSyncDevice(sync => sync.stat(SURELY_EXISTING_PATH)
      .then(stats => expect(stats).to.be.an.instanceof(Fs.Stats))
    , done));

    describe('Stats', function() {

      it("should implement Fs.Stats", function(done) {
        expect(new Stats(0, 0, 0)).to.be.an.instanceof(Fs.Stats);
        return done();
      });

      dt("should set the `.mode` property for isFile() etc", done => forEachSyncDevice(sync => sync.stat(SURELY_EXISTING_FILE)
        .then(function(stats) {
          expect(stats).to.be.an.instanceof(Fs.Stats);
          expect(stats.mode).to.be.above(0);
          expect(stats.isFile()).to.be.true;
          return expect(stats.isDirectory()).to.be.false;
      })
      , done));

      dt("should set the `.size` property", done => forEachSyncDevice(sync => sync.stat(SURELY_EXISTING_FILE)
        .then(function(stats) {
          expect(stats).to.be.an.instanceof(Fs.Stats);
          expect(stats.isFile()).to.be.true;
          return expect(stats.size).to.be.above(0);
      })
      , done));

      return dt("should set the `.mtime` property", done => forEachSyncDevice(sync => sync.stat(SURELY_EXISTING_FILE)
        .then(function(stats) {
          expect(stats).to.be.an.instanceof(Fs.Stats);
          return expect(stats.mtime).to.be.an.instanceof(Date);
      })
      , done));
    });

    return describe('Entry', function() {

      it("should implement Stats", function(done) {
        expect(new Entry('foo', 0, 0, 0)).to.be.an.instanceof(Stats);
        return done();
      });

      dt("should set the `.name` property", done => forEachSyncDevice(sync => sync.readdir(SURELY_EXISTING_PATH)
        .then(function(files) {
          expect(files).to.be.an('Array');
          return files.forEach(function(file) {
            expect(file.name).to.not.be.null;
            return expect(file).to.be.an.instanceof(Entry);
          });
      })
      , done));

      return dt("should set the Stats properties", done => forEachSyncDevice(sync => sync.readdir(SURELY_EXISTING_PATH)
        .then(function(files) {
          expect(files).to.be.an('Array');
          return files.forEach(function(file) {
            expect(file.mode).to.not.be.null;
            expect(file.size).to.not.be.null;
            return expect(file.mtime).to.not.be.null;
          });
      })
      , done));
    });
  });
});
