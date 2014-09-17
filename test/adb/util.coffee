Stream = require 'stream'
Promise = require 'bluebird'
Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = require 'chai'

util = require '../../src/adb/util'

describe 'util', ->

  describe 'readAll(stream)', ->

    it "should return a cancellable Promise", (done) ->
      stream = new Stream.PassThrough
      promise = util.readAll(stream)
      expect(promise).to.be.an.instanceOf Promise
      expect(promise.isCancellable()).to.be.true
      promise.catch Promise.CancellationError, (err) ->
        done()
      promise.cancel()

    it "should read all remaining content until the stream ends", (done) ->
      stream = new Stream.PassThrough
      util.readAll(stream)
        .then (buf) ->
          expect(buf.length).to.equal 3
          expect(buf.toString()).to.equal 'FOO'
          done()
      stream.write 'F'
      stream.write 'O'
      stream.write 'O'
      stream.end()
