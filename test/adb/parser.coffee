Stream = require 'stream'
Promise = require 'bluebird'
Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = require 'chai'

Parser = require '../../src/adb/parser'

describe 'Parser', ->

  describe 'end()', ->

    it "should end the stream and consume all remaining data", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      stream.write 'F'
      stream.write 'O'
      stream.write 'O'
      parser.end()
        .then ->
          done()

  describe 'readAll()', ->

    it "should return a cancellable Promise", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      promise = parser.readAll()
      expect(promise).to.be.an.instanceOf Promise
      expect(promise.isCancellable()).to.be.true
      promise.catch Promise.CancellationError, (err) ->
        done()
      promise.cancel()

    it "should read all remaining content until the stream ends", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      parser.readAll()
        .then (buf) ->
          expect(buf.length).to.equal 3
          expect(buf.toString()).to.equal 'FOO'
          done()
      stream.write 'F'
      stream.write 'O'
      stream.write 'O'
      stream.end()

    it "should resolve with an empty Buffer if the stream has already ended
        and there's nothing more to read", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      parser.readAll()
        .then (buf) ->
          expect(buf.length).to.equal 0
          done()
      stream.end()

  describe 'readBytes(howMany)', ->

    it "should return a cancellable Promise", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      promise = parser.readBytes 1
      expect(promise).to.be.an.instanceOf Promise
      expect(promise.isCancellable()).to.be.true
      promise.catch Promise.CancellationError, (err) ->
        done()
      promise.cancel()

    it "should read as many bytes as requested", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      parser.readBytes 4
        .then (buf) ->
          expect(buf.length).to.equal 4
          expect(buf.toString()).to.equal 'OKAY'
          parser.readBytes 2
            .then (buf) ->
              expect(buf).to.have.length 2
              expect(buf.toString()).to.equal 'FA'
              done()
      stream.write 'OKAYFAIL'

    it "should wait for enough data to appear", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      parser.readBytes 5
        .then (buf) ->
          expect(buf.toString()).to.equal 'BYTES'
          done()
      Promise.delay 50
        .then ->
          stream.write 'BYTES'

    it "should keep data waiting even when nothing has been
        requested", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      stream.write 'FOO'
      Promise.delay 50
        .then ->
          parser.readBytes 2
            .then (buf) ->
              expect(buf.length).to.equal 2
              expect(buf.toString()).to.equal 'FO'
              done()

    it "should reject with Parser.PrematureEOFError if stream ends
        before enough bytes can be read", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      stream.write 'F'
      parser.readBytes 10
        .catch Parser.PrematureEOFError, (err) ->
          expect(err.missingBytes).to.equal 9
          done()
      stream.end()

  describe 'readByteFlow(maxHowMany, targetStream)', ->

    it "should return a cancellable Promise", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      target = new Stream.PassThrough
      promise = parser.readByteFlow 1, target
      expect(promise).to.be.an.instanceOf Promise
      expect(promise.isCancellable()).to.be.true
      promise.catch Promise.CancellationError, (err) ->
        done()
      promise.cancel()

    it "should read as many bytes as requested", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      target = new Stream.PassThrough
      parser.readByteFlow 4, target
        .then ->
          expect(target.read()).to.eql new Buffer('OKAY')
          parser.readByteFlow 2, target
            .then ->
              expect(target.read()).to.eql new Buffer('FA')
              done()
        .catch done
      stream.write 'OKAYFAIL'

    it "should progress with new/partial chunk until maxHowMany", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      target = new Stream.PassThrough
      parser.readByteFlow 3, target
        .then ->
          expect(target.read()).to.eql new Buffer('PIE')
          done()
        .catch done
      b1 = new Buffer 'P'
      b2 = new Buffer 'I'
      b3 = new Buffer 'ES'
      b4 = new Buffer 'R'
      stream.write b1
      stream.write b2
      stream.write b3
      stream.write b4

  describe 'readAscii(howMany)', ->

    it "should return a cancellable Promise", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      promise = parser.readAscii 1
      expect(promise).to.be.an.instanceOf Promise
      expect(promise.isCancellable()).to.be.true
      promise.catch Promise.CancellationError, (err) ->
        done()
      promise.cancel()

    it "should read as many ascii characters as requested", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      parser.readAscii 4
        .then (str) ->
          expect(str.length).to.equal 4
          expect(str).to.equal 'OKAY'
          done()
      stream.write 'OKAYFAIL'

    it "should reject with Parser.PrematureEOFError if stream ends
        before enough bytes can be read", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      stream.write 'FOO'
      parser.readAscii 7
        .catch Parser.PrematureEOFError, (err) ->
          expect(err.missingBytes).to.equal 4
          done()
      stream.end()

  describe 'readValue()', ->

    it "should return a cancellable Promise", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      promise = parser.readValue()
      expect(promise).to.be.an.instanceOf Promise
      expect(promise.isCancellable()).to.be.true
      promise.catch Promise.CancellationError, (err) ->
        done()
      promise.cancel()

    it "should read a protocol value as a Buffer", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      parser.readValue()
        .then (value) ->
          expect(value).to.be.an.instanceOf Buffer
          expect(value).to.have.length 4
          expect(value.toString()).to.equal '001f'
          done()
      stream.write '0004001f'

    it "should return an empty value", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      parser.readValue()
        .then (value) ->
          expect(value).to.be.an.instanceOf Buffer
          expect(value).to.have.length 0
          done()
      stream.write '0000'

    it "should reject with Parser.PrematureEOFError if stream ends
        before the value can be read", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      parser.readValue()
        .catch Parser.PrematureEOFError, (err) ->
          done()
      stream.write '00ffabc'
      stream.end()

  describe 'readError()', ->

    it "should return a cancellable Promise", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      promise = parser.readError()
      expect(promise).to.be.an.instanceOf Promise
      expect(promise.isCancellable()).to.be.true
      promise.catch Promise.CancellationError, (err) ->
        done()
      promise.cancel()

    it "should reject with Parser.FailError using the value", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      parser.readError()
        .catch Parser.FailError, (err) ->
          expect(err.message).to.equal "Failure: 'epic failure'"
          done()
      stream.write '000cepic failure'

    it "should reject with Parser.PrematureEOFError if stream ends
        before the error can be read", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      parser.readError()
        .catch Parser.PrematureEOFError, (err) ->
          done()
      stream.write '000cepic'
      stream.end()

  describe 'searchLine(re)', ->

    it "should return a cancellable Promise", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      promise = parser.searchLine /foo/
      expect(promise).to.be.an.instanceOf Promise
      expect(promise.isCancellable()).to.be.true
      promise.catch Promise.CancellationError, (err) ->
        done()
      promise.cancel()

    it "should return the re.exec match of the matching line", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      parser.searchLine /za(p)/
        .then (line) ->
          expect(line[0]).to.equal 'zap'
          expect(line[1]).to.equal 'p'
          expect(line.input).to.equal 'zip zap'
          done()
      stream.write 'foo bar\nzip zap\npip pop\n'

    it "should reject with Parser.PrematureEOFError if stream ends
        before a line is found", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      parser.searchLine /nope/
        .catch Parser.PrematureEOFError, (err) ->
          done()
      stream.write 'foo bar'
      stream.end()

  describe 'readLine()', ->

    it "should return a cancellable Promise", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      promise = parser.readLine()
      expect(promise).to.be.an.instanceOf Promise
      expect(promise.isCancellable()).to.be.true
      promise.catch Promise.CancellationError, (err) ->
        done()
      promise.cancel()

    it "should skip a line terminated by \\n", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      parser.readLine()
        .then ->
          parser.readBytes 7
            .then (buf) ->
              expect(buf.toString()).to.equal 'zip zap'
              done()
      stream.write 'foo bar\nzip zap\npip pop'

    it "should return skipped line", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      parser.readLine()
        .then (buf) ->
          expect(buf.toString()).to.equal 'foo bar'
          done()
      stream.write 'foo bar\nzip zap\npip pop'

    it "should strip trailing \\r", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      parser.readLine()
        .then (buf) ->
          expect(buf.toString()).to.equal 'foo bar'
          done()
      stream.write 'foo bar\r\n'

    it "should reject with Parser.PrematureEOFError if stream ends
        before a line is found", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      parser.readLine()
        .catch Parser.PrematureEOFError, (err) ->
          done()
      stream.write 'foo bar'
      stream.end()

  describe 'readUntil(code)', ->

    it "should return a cancellable Promise", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      promise = parser.readUntil 0xa0
      expect(promise).to.be.an.instanceOf Promise
      expect(promise.isCancellable()).to.be.true
      promise.catch Promise.CancellationError, (err) ->
        done()
      promise.cancel()

    it "should return any characters before given value", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      parser.readUntil 'p'.charCodeAt 0
        .then (buf) ->
          expect(buf.toString()).to.equal 'foo bar\nzi'
          done()
      stream.write 'foo bar\nzip zap\npip pop'

    it "should reject with Parser.PrematureEOFError if stream ends
        before a line is found", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      parser.readUntil 'z'.charCodeAt 0
        .catch Parser.PrematureEOFError, (err) ->
          done()
      stream.write 'ho ho'
      stream.end()

  describe 'raw()', ->

    it "should return the resumed raw stream", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      raw = parser.raw()
      expect(raw).to.equal stream
      raw.on 'data', ->
        done()
      raw.write 'foo'

  describe 'unexpected(data, expected)', ->

    it "should reject with Parser.UnexpectedDataError", (done) ->
      stream = new Stream.PassThrough
      parser = new Parser stream
      parser.unexpected('foo', "'bar' or end of stream")
        .catch Parser.UnexpectedDataError, (err) ->
          expect(err.message).to.equal "Unexpected 'foo', was expecting 'bar'
            or end of stream"
          expect(err.unexpected).to.equal 'foo'
          expect(err.expected).to.equal "'bar' or end of stream"
          done()
