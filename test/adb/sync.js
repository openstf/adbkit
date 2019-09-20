var Adb, Chai, Entry, Fs, MockConnection, Promise, PullTransfer, PushTransfer, Sinon, Stats, Stream, Sync, assert, expect;

Fs = require('fs');

Stream = require('stream');

Promise = require('bluebird');

Sinon = require('sinon');

Chai = require('chai');

Chai.use(require('sinon-chai'));

expect = Chai.expect, assert = Chai.assert;

Adb = require('../../src/adb');

Sync = require('../../src/adb/sync');

Stats = require('../../src/adb/sync/stats');

Entry = require('../../src/adb/sync/entry');

PushTransfer = require('../../src/adb/sync/pushtransfer');

PullTransfer = require('../../src/adb/sync/pulltransfer');

MockConnection = require('../mock/connection');

describe('Sync', function() {
  var SURELY_EXISTING_FILE, SURELY_EXISTING_PATH, SURELY_NONEXISTING_PATH, SURELY_WRITABLE_FILE, client, deviceList, dt, forEachSyncDevice;
  dt = xit;
  if (process.env.RUN_DEVICE_TESTS) {
    dt = it;
  }
  SURELY_EXISTING_FILE = '/system/build.prop';
  SURELY_EXISTING_PATH = '/';
  SURELY_NONEXISTING_PATH = '/non-existing-path';
  SURELY_WRITABLE_FILE = '/data/local/tmp/_sync.test';
  client = null;
  deviceList = null;
  forEachSyncDevice = function(iterator, done) {
    var promises;
    assert(deviceList.length > 0, 'At least one connected Android device is required');
    promises = deviceList.map(function(device) {
      return client.syncService(device.id).then(function(sync) {
        expect(sync).to.be.an["instanceof"](Sync);
        return Promise.cast(iterator(sync))["finally"](function() {
          return sync.end();
        });
      });
    });
    return Promise.all(promises).then(function() {
      return done();
    })["catch"](done);
  };
  before(function(done) {
    client = Adb.createClient();
    return client.listDevices().then(function(devices) {
      deviceList = devices;
      return done();
    });
  });
  describe('end()', function() {
    return it("should end the sync connection", function() {
      var conn, sync;
      conn = new MockConnection;
      sync = new Sync(conn);
      Sinon.stub(conn, 'end');
      sync.end();
      return expect(conn.end).to.have.been.called;
    });
  });
  describe('push(contents, path[, mode])', function() {
    it("should call pushStream when contents is a Stream", function() {
      var conn, stream, sync;
      conn = new MockConnection;
      sync = new Sync(conn);
      stream = new Stream.PassThrough;
      Sinon.stub(sync, 'pushStream');
      sync.push(stream, 'foo');
      return expect(sync.pushStream).to.have.been.called;
    });
    it("should call pushFile when contents is a String", function() {
      var conn, stream, sync;
      conn = new MockConnection;
      sync = new Sync(conn);
      stream = new Stream.PassThrough;
      Sinon.stub(sync, 'pushFile');
      sync.push(__filename, 'foo');
      return expect(sync.pushFile).to.have.been.called;
    });
    return it("should return a PushTransfer instance", function() {
      var conn, stream, sync, transfer;
      conn = new MockConnection;
      sync = new Sync(conn);
      stream = new Stream.PassThrough;
      transfer = sync.push(stream, 'foo');
      expect(transfer).to.be.an["instanceof"](PushTransfer);
      return transfer.cancel();
    });
  });
  describe('pushStream(stream, path[, mode])', function() {
    it("should return a PushTransfer instance", function() {
      var conn, stream, sync, transfer;
      conn = new MockConnection;
      sync = new Sync(conn);
      stream = new Stream.PassThrough;
      transfer = sync.pushStream(stream, 'foo');
      expect(transfer).to.be.an["instanceof"](PushTransfer);
      return transfer.cancel();
    });
    return dt("should be able to push >65536 byte chunks without error", function(done) {
      return forEachSyncDevice(function(sync) {
        return new Promise(function(resolve, reject) {
          var content, stream, transfer;
          stream = new Stream.PassThrough;
          content = new Buffer(1000000);
          transfer = sync.pushStream(stream, SURELY_WRITABLE_FILE);
          transfer.on('error', reject);
          transfer.on('end', resolve);
          stream.write(content);
          return stream.end();
        });
      }, done);
    });
  });
  describe('pull(path)', function() {
    dt("should retrieve the same content pushStream() pushed", function(done) {
      return forEachSyncDevice(function(sync) {
        return new Promise(function(resolve, reject) {
          var content, stream, transfer;
          stream = new Stream.PassThrough;
          content = 'ABCDEFGHI' + Date.now();
          transfer = sync.pushStream(stream, SURELY_WRITABLE_FILE);
          expect(transfer).to.be.an["instanceof"](PushTransfer);
          transfer.on('error', reject);
          transfer.on('end', function() {
            transfer = sync.pull(SURELY_WRITABLE_FILE);
            expect(transfer).to.be.an["instanceof"](PullTransfer);
            transfer.on('error', reject);
            return transfer.on('readable', function() {
              var chunk;
              while (chunk = transfer.read()) {
                expect(chunk).to.not.be["null"];
                expect(chunk.toString()).to.equal(content);
                return resolve();
              }
            });
          });
          stream.write(content);
          return stream.end();
        });
      }, done);
    });
    dt("should emit error for non-existing files", function(done) {
      return forEachSyncDevice(function(sync) {
        return new Promise(function(resolve, reject) {
          var transfer;
          transfer = sync.pull(SURELY_NONEXISTING_PATH);
          return transfer.on('error', resolve);
        });
      }, done);
    });
    dt("should return a PullTransfer instance", function(done) {
      return forEachSyncDevice(function(sync) {
        var rval;
        rval = sync.pull(SURELY_EXISTING_FILE);
        expect(rval).to.be.an["instanceof"](PullTransfer);
        return rval.cancel();
      }, done);
    });
    return describe('Stream', function() {
      return dt("should emit 'end' when pull is done", function(done) {
        return forEachSyncDevice(function(sync) {
          return new Promise(function(resolve, reject) {
            var transfer;
            transfer = sync.pull(SURELY_EXISTING_FILE);
            transfer.on('error', reject);
            transfer.on('end', resolve);
            return transfer.resume();
          });
        }, done);
      });
    });
  });
  return describe('stat(path)', function() {
    dt("should return a Promise", function(done) {
      return forEachSyncDevice(function(sync) {
        var rval;
        rval = sync.stat(SURELY_EXISTING_PATH);
        expect(rval).to.be.an["instanceof"](Promise);
        return rval;
      }, done);
    });
    dt("should call with an ENOENT error if the path does not exist", function(done) {
      return forEachSyncDevice(function(sync) {
        return sync.stat(SURELY_NONEXISTING_PATH).then(function(stats) {
          throw new Error('Should not reach success branch');
        })["catch"](function(err) {
          expect(err).to.be.an["instanceof"](Error);
          expect(err.code).to.equal('ENOENT');
          expect(err.errno).to.equal(34);
          return expect(err.path).to.equal(SURELY_NONEXISTING_PATH);
        });
      }, done);
    });
    dt("should call with an fs.Stats instance for an existing path", function(done) {
      return forEachSyncDevice(function(sync) {
        return sync.stat(SURELY_EXISTING_PATH).then(function(stats) {
          return expect(stats).to.be.an["instanceof"](Fs.Stats);
        });
      }, done);
    });
    describe('Stats', function() {
      it("should implement Fs.Stats", function(done) {
        expect(new Stats(0, 0, 0)).to.be.an["instanceof"](Fs.Stats);
        return done();
      });
      dt("should set the `.mode` property for isFile() etc", function(done) {
        return forEachSyncDevice(function(sync) {
          return sync.stat(SURELY_EXISTING_FILE).then(function(stats) {
            expect(stats).to.be.an["instanceof"](Fs.Stats);
            expect(stats.mode).to.be.above(0);
            expect(stats.isFile()).to.be["true"];
            return expect(stats.isDirectory()).to.be["false"];
          });
        }, done);
      });
      dt("should set the `.size` property", function(done) {
        return forEachSyncDevice(function(sync) {
          return sync.stat(SURELY_EXISTING_FILE).then(function(stats) {
            expect(stats).to.be.an["instanceof"](Fs.Stats);
            expect(stats.isFile()).to.be["true"];
            return expect(stats.size).to.be.above(0);
          });
        }, done);
      });
      return dt("should set the `.mtime` property", function(done) {
        return forEachSyncDevice(function(sync) {
          return sync.stat(SURELY_EXISTING_FILE).then(function(stats) {
            expect(stats).to.be.an["instanceof"](Fs.Stats);
            return expect(stats.mtime).to.be.an["instanceof"](Date);
          });
        }, done);
      });
    });
    return describe('Entry', function() {
      it("should implement Stats", function(done) {
        expect(new Entry('foo', 0, 0, 0)).to.be.an["instanceof"](Stats);
        return done();
      });
      dt("should set the `.name` property", function(done) {
        return forEachSyncDevice(function(sync) {
          return sync.readdir(SURELY_EXISTING_PATH).then(function(files) {
            expect(files).to.be.an('Array');
            return files.forEach(function(file) {
              expect(file.name).to.not.be["null"];
              return expect(file).to.be.an["instanceof"](Entry);
            });
          });
        }, done);
      });
      return dt("should set the Stats properties", function(done) {
        return forEachSyncDevice(function(sync) {
          return sync.readdir(SURELY_EXISTING_PATH).then(function(files) {
            expect(files).to.be.an('Array');
            return files.forEach(function(file) {
              expect(file.mode).to.not.be["null"];
              expect(file.size).to.not.be["null"];
              return expect(file.mtime).to.not.be["null"];
            });
          });
        }, done);
      });
    });
  });
});
