import { PassThrough, Writable } from 'stream';

type Callback = (error: Error | null | undefined) => void;

export default class PullTransfer extends PassThrough implements Writable {
    stats = { bytesTransferred: 0 };

    cancel() {
        return this.emit('cancel');
    }

    write(chunk: Buffer, cb?: Callback): boolean;
    write(chunk: Buffer, encoding?: string, cb?: Callback): boolean;
    write(chunk: Buffer, encoding?: any, callback?: Callback) {
        this.stats.bytesTransferred += chunk.length;
        this.emit('progress', this.stats);
        return super.write(chunk, encoding, callback);
    }
}
