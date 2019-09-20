/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const Stream = require('stream');
const Promise = require('bluebird');
const Sinon = require('sinon');
const Chai = require('chai');
Chai.use(require('sinon-chai'));
const {expect} = require('chai');

const util = require('../../src/adb/util');

describe('util', () => describe('readAll(stream)', function() {

  it("should return a cancellable Promise", function(done) {
    const stream = new Stream.PassThrough;
    const promise = util.readAll(stream);
    expect(promise).to.be.an.instanceOf(Promise);
    expect(promise.isCancellable()).to.be.true;
    promise.catch(Promise.CancellationError, err => done());
    return promise.cancel();
  });

  return it("should read all remaining content until the stream ends", function(done) {
    const stream = new Stream.PassThrough;
    util.readAll(stream)
      .then(function(buf) {
        expect(buf.length).to.equal(3);
        expect(buf.toString()).to.equal('FOO');
        return done();
    });
    stream.write('F');
    stream.write('O');
    stream.write('O');
    return stream.end();
  });
}));
