import { readAll } from '../../src/adb/util';
import { PassThrough } from 'stream';
import { CancellationError } from '../../src/adb/tracker';

describe('util', () =>
    describe('readAll(stream)', () => {
        it('should return a cancellable Promise', async () => {
            const stream = new PassThrough();
            const controller = new AbortController();
            const promise = readAll(stream, controller.signal);
            expect(promise).toBeInstanceOf(Promise);
            controller.abort();
            await expect(promise).rejects.toThrow(CancellationError);
        });

        it('should read all remaining content until the stream ends', async () => {
            const stream = new PassThrough();
            const promise = readAll(stream);
            stream.write('F');
            stream.write('O');
            stream.write('O');
            stream.end();

            const buf = await promise;
            expect(buf.length).toBe(3);
            expect(buf.toString()).toBe('FOO');
        });
    }));
