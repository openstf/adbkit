import { Duplex } from 'stream';

export default class MockDuplex extends Duplex {
    _read(size: number) {}

    _write(
        chunk: any,
        encoding: string,
        callback: (error?: Error | null) => void,
    ) {
        this.emit('write', chunk, encoding, callback);
        callback(null);
    }

    causeRead(chunk: any) {
        if (!Buffer.isBuffer(chunk)) {
            chunk = new Buffer(chunk);
        }
        this.push(chunk);
    }

    causeEnd() {
        this.push(null);
    }

    end(cb?: () => void): void;
    end(chunk: any, cb?: () => void): void;
    end(chunk: any, encoding?: string, cb?: () => void): void;
    end() {
        this.causeEnd(); // In order to better emulate socket streams
        return Duplex.prototype.end.apply(this, arguments as any);
    }
}
