import { EventEmitter } from 'events';

export default class PushTransfer extends EventEmitter {
    _stack: number[] = [];
    stats = { bytesTransferred: 0 };

    cancel() {
        return this.emit('cancel');
    }

    push(byteCount: number) {
        return this._stack.push(byteCount);
    }

    pop() {
        const byteCount = this._stack.pop()!;
        this.stats.bytesTransferred += byteCount;
        return this.emit('progress', this.stats);
    }

    end() {
        return this.emit('end');
    }
}
