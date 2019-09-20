var Chai, Promise, Sinon, Stream, expect, util;

Stream = require('stream');

Promise = require('bluebird');

Sinon = require('sinon');

Chai = require('chai');

Chai.use(require('sinon-chai'));

expect = require('chai').expect;

util = require('../../src/adb/util');

describe('util', function() {
  return describe('readAll(stream)', function() {
    it("should return a cancellable Promise", function(done) {
      var promise, stream;
      stream = new Stream.PassThrough;
      promise = util.readAll(stream);
      expect(promise).to.be.an.instanceOf(Promise);
      expect(promise.isCancellable()).to.be["true"];
      promise["catch"](Promise.CancellationError, function(err) {
        return done();
      });
      return promise.cancel();
    });
    return it("should read all remaining content until the stream ends", function(done) {
      var stream;
      stream = new Stream.PassThrough;
      util.readAll(stream).then(function(buf) {
        expect(buf.length).to.equal(3);
        expect(buf.toString()).to.equal('FOO');
        return done();
      });
      stream.write('F');
      stream.write('O');
      stream.write('O');
      return stream.end();
    });
  });
});
