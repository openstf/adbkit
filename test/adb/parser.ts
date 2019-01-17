import { PassThrough } from 'stream';
import Parser, {
    UnexpectedDataError,
    PrematureEOFError,
    FailError,
} from '../../src/adb/parser';
import { CancellationError } from '../../src/adb/tracker';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('Parser', () => {
    describe('end()', () =>
        it('should end the stream and consume all remaining data', async () => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            stream.write('F');
            stream.write('O');
            stream.write('O');
            await parser.end();
        }));

    describe('readAll()', () => {
        it('should return a cancellable Promise', done => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            const controller = new AbortController();
            const promise = parser.readAll(controller.signal);
            expect(promise).toBeInstanceOf(Promise);
            promise.catch(err => {
                if (err instanceof CancellationError) done();
            });
            controller.abort();
        });

        it('should read all remaining content until the stream ends', async () => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            const promise = parser.readAll();
            stream.write('F');
            stream.write('O');
            stream.write('O');
            stream.end();
            const buf = await promise;
            expect(buf.length).toBe(3);
            expect(buf.toString()).toBe('FOO');
        });

        it("should resolve with an empty Buffer if the stream has already ended and there's nothing more to read", async () => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            const promise = parser.readAll();
            stream.end();
            const buf = await promise;
            expect(buf.length).toBe(0);
        });
    });

    describe('readBytes(howMany)', () => {
        it('should return a cancellable Promise', done => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            const controller = new AbortController();
            const promise = parser.readBytes(1, controller.signal);
            expect(promise).toBeInstanceOf(Promise);
            promise.catch(err => {
                if (err instanceof CancellationError) done();
            });
            controller.abort();
        });

        it('should read as many bytes as requested', async () => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            const promise = parser.readBytes(4);
            stream.write('OKAYFAIL');
            const buf = await promise;
            expect(buf.length).toBe(4);
            expect(buf.toString()).toBe('OKAY');
            const buf_1 = await parser.readBytes(2);
            expect(buf_1).toHaveLength(2);
            expect(buf_1.toString()).toBe('FA');
        });

        it('should wait for enough data to appear', done => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            parser.readBytes(5).then(function(buf) {
                expect(buf.toString()).toBe('BYTES');
                done();
            });

            delay(50).then(() => stream.write('BYTES'));
        });

        it('should keep data waiting even when nothing has been requested', async () => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            stream.write('FOO');
            await delay(50);
            const buf = await parser.readBytes(2);
            expect(buf.length).toBe(2);
            expect(buf.toString()).toBe('FO');
        });

        it('should reject with Parser.PrematureEOFError if stream ends before enough bytes can be read', done => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            stream.write('F');
            parser.readBytes(10).catch(err => {
                if (err instanceof PrematureEOFError) {
                    expect(err.missingBytes).toBe(9);
                    done();
                }
            });
            stream.end();
        });
    });

    describe('readByteFlow(maxHowMany, targetStream)', () => {
        it('should return a cancellable Promise', done => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            const target = new PassThrough();
            const controller = new AbortController();
            const promise = parser.readByteFlow(1, target, controller.signal);
            expect(promise).toBeInstanceOf(Promise);
            promise.catch(err => {
                if (err instanceof CancellationError) done();
            });
            controller.abort();
        });

        it('should read as many bytes as requested', async () => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            const target = new PassThrough();
            const spy = jest.fn();
            target.on('data', spy);
            const promise = parser.readByteFlow(4, target);
            stream.write('OKAYFAIL');
            try {
                await promise;
                await parser.readByteFlow(2, target);
                expect(spy).toBeCalledTimes(2);
                expect(spy.mock.calls[0]).toEqual([new Buffer('OKAY')]);
                expect(spy.mock.calls[1]).toEqual([new Buffer('FA')]);
            } catch (err) {
                // Do nothing
            }
        });

        it('should progress with new/partial chunk until maxHowMany', async () => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            const target = new PassThrough();
            const spy = jest.fn();
            target.on('data', spy);
            const promise = parser.readByteFlow(3, target);
            var b1 = new Buffer('P');
            var b2 = new Buffer('I');
            const b3 = new Buffer('ES');
            const b4 = new Buffer('R');
            stream.write(b1);
            stream.write(b2);
            stream.write(b3);
            stream.write(b4);
            try {
                await promise;
                expect(spy).toBeCalledTimes(3);
                expect(spy).toBeCalledWith(b1);
                expect(spy).toBeCalledWith(b2);
                expect(spy.mock.calls[2]).toEqual([new Buffer('E')]);
            } catch (err) {
                // Do nothing
            }
        });

        it('should resolve on last chunk', async () => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            const target = new PassThrough();
            const spy = jest.fn();
            target.on('data', spy);
            const promise = parser.readByteFlow(3, target);
            var b1 = new Buffer('P');
            var b2 = new Buffer('I');
            var b3 = new Buffer('E');
            const b4 = new Buffer('S');
            stream.write(b1);
            stream.write(b2);
            stream.write(b3);
            stream.write(b4);
            try {
                await promise;
                expect(spy).toBeCalledTimes(3);
                expect(spy).toBeCalledWith(b1);
                expect(spy).toBeCalledWith(b2);
                expect(spy).toBeCalledWith(b3);
            } catch (err) {
                // Do nothing
            }
        });
    });

    describe('readAscii(howMany)', () => {
        it('should return a cancellable Promise', done => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            const controller = new AbortController();
            const promise = parser.readAscii(1, controller.signal);
            expect(promise).toBeInstanceOf(Promise);
            promise.catch(err => {
                if (err instanceof CancellationError) done();
            });
            controller.abort();
        });

        it('should read as many ascii characters as requested', async () => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            const promise = parser.readAscii(4);
            stream.write('OKAYFAIL');
            const str = await promise;
            expect(str.length).toBe(4);
            expect(str).toBe('OKAY');
        });

        it('should reject with Parser.PrematureEOFError if stream ends before enough bytes can be read', done => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            stream.write('FOO');
            parser.readAscii(7).catch(err => {
                if (err instanceof PrematureEOFError) {
                    expect(err.missingBytes).toBe(4);
                    done();
                }
            });
            stream.end();
        });
    });

    describe('readValue()', () => {
        it('should return a cancellable Promise', done => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            const controller = new AbortController();
            const promise = parser.readValue(controller.signal);
            expect(promise).toBeInstanceOf(Promise);
            promise.catch(err => {
                if (err instanceof CancellationError) done();
            });
            controller.abort();
        });

        it('should read a protocol value as a Buffer', async () => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            const promise = parser.readValue();
            stream.write('0004001f');
            const value = await promise;
            expect(value).toBeInstanceOf(Buffer);
            expect(value).toHaveLength(4);
            expect(value.toString()).toBe('001f');
        });

        it('should return an empty value', async () => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            const promise = parser.readValue();
            stream.write('0000');
            const value = await promise;
            expect(value).toBeInstanceOf(Buffer);
            expect(value).toHaveLength(0);
        });

        it('should reject with Parser.PrematureEOFError if stream ends before the value can be read', done => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            parser.readValue().catch(err => {
                if (err instanceof PrematureEOFError) done();
            });
            stream.write('00ffabc');
            stream.end();
        });
    });

    describe('readError()', () => {
        it('should return a cancellable Promise', done => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            const controller = new AbortController();
            const promise = parser.readError(controller.signal);
            expect(promise).toBeInstanceOf(Promise);
            promise.catch(err => {
                if (err instanceof CancellationError) done();
            });
            controller.abort();
        });

        it('should reject with Parser.FailError using the value', done => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            parser.readError().catch(err => {
                if (err instanceof FailError) {
                    expect(err.message).toBe("Failure: 'epic failure'");
                    done();
                }
            });
            stream.write('000cepic failure');
        });

        it('should reject with Parser.PrematureEOFError if stream ends \
before the error can be read', done => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            parser.readError().catch(err => {
                if (err instanceof PrematureEOFError) done();
            });
            stream.write('000cepic');
            stream.end();
        });
    });

    describe('searchLine(re)', () => {
        it('should return a cancellable Promise', done => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            const controller = new AbortController();
            const promise = parser.searchLine(/foo/, controller.signal);
            expect(promise).toBeInstanceOf(Promise);
            promise.catch(err => {
                if (err instanceof CancellationError) done();
            });
            controller.abort();
        });

        it('should return the re.exec match of the matching line', async () => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            const promise = parser.searchLine(/za(p)/);
            stream.write('foo bar\nzip zap\npip pop\n');
            const line = await promise;
            expect(line[0]).toBe('zap');
            expect(line[1]).toBe('p');
            expect(line.input).toBe('zip zap');
        });

        it('should reject with Parser.PrematureEOFError if stream ends \
before a line is found', done => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            parser.searchLine(/nope/).catch(err => {
                if (err instanceof PrematureEOFError) done();
            });
            stream.write('foo bar');
            stream.end();
        });
    });

    describe('readLine()', () => {
        it('should return a cancellable Promise', done => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            const controller = new AbortController();
            const promise = parser.readLine(controller.signal);
            expect(promise).toBeInstanceOf(Promise);
            promise.catch(err => {
                if (err instanceof CancellationError) done();
            });
            controller.abort();
        });

        it('should skip a line terminated by \\n', async () => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            await parser.readLine();
            const buf = await parser.readBytes(7);
            expect(buf.toString()).toBe('zip zap');
            stream.write('foo bar\nzip zap\npip pop');
        });

        it('should return skipped line', async () => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            const buf = await parser.readLine();
            expect(buf.toString()).toBe('foo bar');
            stream.write('foo bar\nzip zap\npip pop');
        });

        it('should strip trailing \\r', async () => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            const buf = await parser.readLine();
            expect(buf.toString()).toBe('foo bar');
            stream.write('foo bar\r\n');
        });

        it('should reject with Parser.PrematureEOFError if stream ends before a line is found', done => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            parser.readLine().catch(err => {
                if (err instanceof PrematureEOFError) done();
            });
            stream.write('foo bar');
            stream.end();
        });
    });

    describe('readUntil(code)', () => {
        it('should return a cancellable Promise', done => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            const controller = new AbortController();
            const promise = parser.readUntil(0xa0, controller.signal);
            expect(promise).toBeInstanceOf(Promise);
            promise.catch(err => {
                if (err instanceof CancellationError) done();
            });
            controller.abort();
        });

        it('should return any characters before given value', async () => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            const promise = parser.readUntil('p'.charCodeAt(0));
            stream.write('foo bar\nzip zap\npip pop');
            const buf = await promise;
            expect(buf.toString()).toBe('foo bar\nzi');
        });

        it('should reject with Parser.PrematureEOFError if stream ends before a line is found', done => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            parser.readUntil('z'.charCodeAt(0)).catch(err => {
                if (err instanceof PrematureEOFError) done();
            });
            stream.write('ho ho');
            stream.end();
        });
    });

    describe('raw()', () =>
        it('should return the resumed raw stream', done => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            const raw = parser.raw();
            expect(raw).toBe(stream);
            raw.on('data', () => done());
            raw.write('foo');
        }));

    describe('unexpected(data, expected)', () =>
        it('should reject with Parser.UnexpectedDataError', async done => {
            const stream = new PassThrough();
            const parser = new Parser(stream);
            try {
                await parser.unexpected('foo', "'bar' or end of stream");
            } catch (err) {
                if (err instanceof UnexpectedDataError) {
                    expect(err.message).toBe(
                        "Unexpected 'foo', was expecting 'bar' or end of stream",
                    );
                    expect(err.unexpected).toBe('foo');
                    expect(err.expected).toBe("'bar' or end of stream");
                    done();
                }
            }
        }));
});
