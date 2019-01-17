// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
import Assert from 'assert';
import { Transform, TransformOptions } from 'stream';

interface Meta {
    bpp: number;
    red_offset: number;
    green_offset: number;
    blue_offset: number;
    alpha_offset: number;
}

export default class RgbTransform extends Transform {
    private _buffer = new Buffer('');
    _r_pos = this.meta.red_offset / 8;
    _g_pos = this.meta.green_offset / 8;
    _b_pos = this.meta.blue_offset / 8;
    _a_pos = this.meta.alpha_offset / 8;
    _pixel_bytes = this.meta.bpp / 8;

    constructor(public meta: Meta, options?: TransformOptions) {
        super(options);
        this._buffer = new Buffer('');
        Assert.ok(
            this.meta.bpp === 24 || this.meta.bpp === 32,
            'Only 24-bit and 32-bit raw images with 8-bits per color are supported',
        );
    }

    _transform(chunk: Buffer, encoding: string, done: () => void) {
        if (this._buffer.length) {
            this._buffer = Buffer.concat(
                [this._buffer, chunk],
                this._buffer.length + chunk.length,
            );
        } else {
            this._buffer = chunk;
        }
        let sourceCursor = 0;
        let targetCursor = 0;
        const target =
            this._pixel_bytes === 3
                ? this._buffer
                : new Buffer(
                      Math.max(4, (chunk.length / this._pixel_bytes) * 3),
                  );
        while (this._buffer.length - sourceCursor >= this._pixel_bytes) {
            const r = this._buffer[sourceCursor + this._r_pos];
            const g = this._buffer[sourceCursor + this._g_pos];
            const b = this._buffer[sourceCursor + this._b_pos];
            target[targetCursor + 0] = r;
            target[targetCursor + 1] = g;
            target[targetCursor + 2] = b;
            sourceCursor += this._pixel_bytes;
            targetCursor += 3;
        }
        if (targetCursor) {
            this.push(target.slice(0, targetCursor));
            this._buffer = this._buffer.slice(sourceCursor);
        }
        done();
    }
}
