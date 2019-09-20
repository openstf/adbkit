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

const Parser = require('../../src/adb/parser');

describe('Parser', function() {

  describe('end()', () => it("should end the stream and consume all remaining data", function(done) {
    const stream = new Stream.PassThrough;
    const parser = new Parser(stream);
    stream.write('F');
    stream.write('O');
    stream.write('O');
    return parser.end()
      .then(() => done());
  }));

  describe('readAll()', function() {

    it("should return a cancellable Promise", function(done) {
      const stream = new Stream.PassThrough;
      const parser = new Parser(stream);
      const promise = parser.readAll();
      expect(promise).to.be.an.instanceOf(Promise);
      expect(promise.isCancellable()).to.be.true;
      promise.catch(Promise.CancellationError, err => done());
      return promise.cancel();
    });

    it("should read all remaining content until the stream ends", function(done) {
      const stream = new Stream.PassThrough;
      const parser = new Parser(stream);
      parser.readAll()
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

    return it(`should resolve with an empty Buffer if the stream has already ended \
and there's nothing more to read`, function(done) {
      const stream = new Stream.PassThrough;
      const parser = new Parser(stream);
      parser.readAll()
        .then(function(buf) {
          expect(buf.length).to.equal(0);
          return done();
      });
      return stream.end();
    });
  });

  describe('readBytes(howMany)', function() {

    it("should return a cancellable Promise", function(done) {
      const stream = new Stream.PassThrough;
      const parser = new Parser(stream);
      const promise = parser.readBytes(1);
      expect(promise).to.be.an.instanceOf(Promise);
      expect(promise.isCancellable()).to.be.true;
      promise.catch(Promise.CancellationError, err => done());
      return promise.cancel();
    });

    it("should read as many bytes as requested", function(done) {
      const stream = new Stream.PassThrough;
      const parser = new Parser(stream);
      parser.readBytes(4)
        .then(function(buf) {
          expect(buf.length).to.equal(4);
          expect(buf.toString()).to.equal('OKAY');
          return parser.readBytes(2)
            .then(function(buf) {
              expect(buf).to.have.length(2);
              expect(buf.toString()).to.equal('FA');
              return done();
          });
      });
      return stream.write('OKAYFAIL');
    });

    it("should wait for enough data to appear", function(done) {
      const stream = new Stream.PassThrough;
      const parser = new Parser(stream);
      parser.readBytes(5)
        .then(function(buf) {
          expect(buf.toString()).to.equal('BYTES');
          return done();
      });
      return Promise.delay(50)
        .then(() => stream.write('BYTES'));
    });

    it(`should keep data waiting even when nothing has been \
requested`, function(done) {
      const stream = new Stream.PassThrough;
      const parser = new Parser(stream);
      stream.write('FOO');
      return Promise.delay(50)
        .then(() => parser.readBytes(2)
        .then(function(buf) {
          expect(buf.length).to.equal(2);
          expect(buf.toString()).to.equal('FO');
          return done();
      }));
    });

    return it(`should reject with Parser.PrematureEOFError if stream ends \
before enough bytes can be read`, function(done) {
      const stream = new Stream.PassThrough;
      const parser = new Parser(stream);
      stream.write('F');
      parser.readBytes(10)
        .catch(Parser.PrematureEOFError, function(err) {
          expect(err.missingBytes).to.equal(9);
          return done();
      });
      return stream.end();
    });
  });

  describe('readByteFlow(maxHowMany, targetStream)', function() {

    it("should return a cancellable Promise", function(done) {
      const stream = new Stream.PassThrough;
      const parser = new Parser(stream);
      const target = new Stream.PassThrough;
      const promise = parser.readByteFlow(1, target);
      expect(promise).to.be.an.instanceOf(Promise);
      expect(promise.isCancellable()).to.be.true;
      promise.catch(Promise.CancellationError, err => done());
      return promise.cancel();
    });

    it("should read as many bytes as requested", function(done) {
      const stream = new Stream.PassThrough;
      const parser = new Parser(stream);
      const target = new Stream.PassThrough;
      parser.readByteFlow(4, target)
        .then(function() {
          expect(target.read()).to.eql(new Buffer('OKAY'));
          return parser.readByteFlow(2, target)
            .then(function() {
              expect(target.read()).to.eql(new Buffer('FA'));
              return done();
          });}).catch(done);
      return stream.write('OKAYFAIL');
    });

    return it("should progress with new/partial chunk until maxHowMany", function(done) {
      const stream = new Stream.PassThrough;
      const parser = new Parser(stream);
      const target = new Stream.PassThrough;
      parser.readByteFlow(3, target)
        .then(function() {
          expect(target.read()).to.eql(new Buffer('PIE'));
          return done();}).catch(done);
      const b1 = new Buffer('P');
      const b2 = new Buffer('I');
      const b3 = new Buffer('ES');
      const b4 = new Buffer('R');
      stream.write(b1);
      stream.write(b2);
      stream.write(b3);
      return stream.write(b4);
    });
  });

  describe('readAscii(howMany)', function() {

    it("should return a cancellable Promise", function(done) {
      const stream = new Stream.PassThrough;
      const parser = new Parser(stream);
      const promise = parser.readAscii(1);
      expect(promise).to.be.an.instanceOf(Promise);
      expect(promise.isCancellable()).to.be.true;
      promise.catch(Promise.CancellationError, err => done());
      return promise.cancel();
    });

    it("should read as many ascii characters as requested", function(done) {
      const stream = new Stream.PassThrough;
      const parser = new Parser(stream);
      parser.readAscii(4)
        .then(function(str) {
          expect(str.length).to.equal(4);
          expect(str).to.equal('OKAY');
          return done();
      });
      return stream.write('OKAYFAIL');
    });

    return it(`should reject with Parser.PrematureEOFError if stream ends \
before enough bytes can be read`, function(done) {
      const stream = new Stream.PassThrough;
      const parser = new Parser(stream);
      stream.write('FOO');
      parser.readAscii(7)
        .catch(Parser.PrematureEOFError, function(err) {
          expect(err.missingBytes).to.equal(4);
          return done();
      });
      return stream.end();
    });
  });

  describe('readValue()', function() {

    it("should return a cancellable Promise", function(done) {
      const stream = new Stream.PassThrough;
      const parser = new Parser(stream);
      const promise = parser.readValue();
      expect(promise).to.be.an.instanceOf(Promise);
      expect(promise.isCancellable()).to.be.true;
      promise.catch(Promise.CancellationError, err => done());
      return promise.cancel();
    });

    it("should read a protocol value as a Buffer", function(done) {
      const stream = new Stream.PassThrough;
      const parser = new Parser(stream);
      parser.readValue()
        .then(function(value) {
          expect(value).to.be.an.instanceOf(Buffer);
          expect(value).to.have.length(4);
          expect(value.toString()).to.equal('001f');
          return done();
      });
      return stream.write('0004001f');
    });

    it("should return an empty value", function(done) {
      const stream = new Stream.PassThrough;
      const parser = new Parser(stream);
      parser.readValue()
        .then(function(value) {
          expect(value).to.be.an.instanceOf(Buffer);
          expect(value).to.have.length(0);
          return done();
      });
      return stream.write('0000');
    });

    return it(`should reject with Parser.PrematureEOFError if stream ends \
before the value can be read`, function(done) {
      const stream = new Stream.PassThrough;
      const parser = new Parser(stream);
      parser.readValue()
        .catch(Parser.PrematureEOFError, err => done());
      stream.write('00ffabc');
      return stream.end();
    });
  });

  describe('readError()', function() {

    it("should return a cancellable Promise", function(done) {
      const stream = new Stream.PassThrough;
      const parser = new Parser(stream);
      const promise = parser.readError();
      expect(promise).to.be.an.instanceOf(Promise);
      expect(promise.isCancellable()).to.be.true;
      promise.catch(Promise.CancellationError, err => done());
      return promise.cancel();
    });

    it("should reject with Parser.FailError using the value", function(done) {
      const stream = new Stream.PassThrough;
      const parser = new Parser(stream);
      parser.readError()
        .catch(Parser.FailError, function(err) {
          expect(err.message).to.equal("Failure: 'epic failure'");
          return done();
      });
      return stream.write('000cepic failure');
    });

    return it(`should reject with Parser.PrematureEOFError if stream ends \
before the error can be read`, function(done) {
      const stream = new Stream.PassThrough;
      const parser = new Parser(stream);
      parser.readError()
        .catch(Parser.PrematureEOFError, err => done());
      stream.write('000cepic');
      return stream.end();
    });
  });

  describe('searchLine(re)', function() {

    it("should return a cancellable Promise", function(done) {
      const stream = new Stream.PassThrough;
      const parser = new Parser(stream);
      const promise = parser.searchLine(/foo/);
      expect(promise).to.be.an.instanceOf(Promise);
      expect(promise.isCancellable()).to.be.true;
      promise.catch(Promise.CancellationError, err => done());
      return promise.cancel();
    });

    it("should return the re.exec match of the matching line", function(done) {
      const stream = new Stream.PassThrough;
      const parser = new Parser(stream);
      parser.searchLine(/za(p)/)
        .then(function(line) {
          expect(line[0]).to.equal('zap');
          expect(line[1]).to.equal('p');
          expect(line.input).to.equal('zip zap');
          return done();
      });
      return stream.write('foo bar\nzip zap\npip pop\n');
    });

    return it(`should reject with Parser.PrematureEOFError if stream ends \
before a line is found`, function(done) {
      const stream = new Stream.PassThrough;
      const parser = new Parser(stream);
      parser.searchLine(/nope/)
        .catch(Parser.PrematureEOFError, err => done());
      stream.write('foo bar');
      return stream.end();
    });
  });

  describe('readLine()', function() {

    it("should return a cancellable Promise", function(done) {
      const stream = new Stream.PassThrough;
      const parser = new Parser(stream);
      const promise = parser.readLine();
      expect(promise).to.be.an.instanceOf(Promise);
      expect(promise.isCancellable()).to.be.true;
      promise.catch(Promise.CancellationError, err => done());
      return promise.cancel();
    });

    it("should skip a line terminated by \\n", function(done) {
      const stream = new Stream.PassThrough;
      const parser = new Parser(stream);
      parser.readLine()
        .then(() => parser.readBytes(7)
        .then(function(buf) {
          expect(buf.toString()).to.equal('zip zap');
          return done();
      }));
      return stream.write('foo bar\nzip zap\npip pop');
    });

    it("should return skipped line", function(done) {
      const stream = new Stream.PassThrough;
      const parser = new Parser(stream);
      parser.readLine()
        .then(function(buf) {
          expect(buf.toString()).to.equal('foo bar');
          return done();
      });
      return stream.write('foo bar\nzip zap\npip pop');
    });

    it("should strip trailing \\r", function(done) {
      const stream = new Stream.PassThrough;
      const parser = new Parser(stream);
      parser.readLine()
        .then(function(buf) {
          expect(buf.toString()).to.equal('foo bar');
          return done();
      });
      return stream.write('foo bar\r\n');
    });

    return it(`should reject with Parser.PrematureEOFError if stream ends \
before a line is found`, function(done) {
      const stream = new Stream.PassThrough;
      const parser = new Parser(stream);
      parser.readLine()
        .catch(Parser.PrematureEOFError, err => done());
      stream.write('foo bar');
      return stream.end();
    });
  });

  describe('readUntil(code)', function() {

    it("should return a cancellable Promise", function(done) {
      const stream = new Stream.PassThrough;
      const parser = new Parser(stream);
      const promise = parser.readUntil(0xa0);
      expect(promise).to.be.an.instanceOf(Promise);
      expect(promise.isCancellable()).to.be.true;
      promise.catch(Promise.CancellationError, err => done());
      return promise.cancel();
    });

    it("should return any characters before given value", function(done) {
      const stream = new Stream.PassThrough;
      const parser = new Parser(stream);
      parser.readUntil('p'.charCodeAt(0))
        .then(function(buf) {
          expect(buf.toString()).to.equal('foo bar\nzi');
          return done();
      });
      return stream.write('foo bar\nzip zap\npip pop');
    });

    return it(`should reject with Parser.PrematureEOFError if stream ends \
before a line is found`, function(done) {
      const stream = new Stream.PassThrough;
      const parser = new Parser(stream);
      parser.readUntil('z'.charCodeAt(0))
        .catch(Parser.PrematureEOFError, err => done());
      stream.write('ho ho');
      return stream.end();
    });
  });

  describe('raw()', () => it("should return the resumed raw stream", function(done) {
    const stream = new Stream.PassThrough;
    const parser = new Parser(stream);
    const raw = parser.raw();
    expect(raw).to.equal(stream);
    raw.on('data', () => done());
    return raw.write('foo');
  }));

  return describe('unexpected(data, expected)', () => it("should reject with Parser.UnexpectedDataError", function(done) {
    const stream = new Stream.PassThrough;
    const parser = new Parser(stream);
    return parser.unexpected('foo', "'bar' or end of stream")
      .catch(Parser.UnexpectedDataError, function(err) {
        expect(err.message).to.equal(`Unexpected 'foo', was expecting 'bar' \
or end of stream`
        );
        expect(err.unexpected).to.equal('foo');
        expect(err.expected).to.equal("'bar' or end of stream");
        return done();
    });
  }));
});
