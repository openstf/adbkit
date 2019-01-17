import { EventEmitter } from 'events';

import Command from '../../command';
import { PrematureEOFError } from '../../parser';
import { CancellationError } from '../../tracker';

class Tracker extends EventEmitter {
    pids: string[] = [];
    pidMap = new Set<string>();
    reader: Promise<any>;
    abort!: AbortController;

    constructor(public command: Command) {
        super();
        this.reader = (async () => {
            this.abort = new AbortController();
            try {
                return await this.read(this.abort.signal);
            } catch (err) {
                if (err instanceof PrematureEOFError) {
                    return this.emit('end');
                } else {
                    this.command.connection.end();
                    if (!(err instanceof CancellationError)) {
                        this.emit('error', err);
                    }
                    return this.emit('end');
                }
            }
        })();
    }

    async read(signal: AbortSignal) {
        const list = await this.command.parser!.readValue();
        if (signal.aborted) {
            throw new CancellationError();
        }
        const pids = list.toString().split('\n');
        let maybeEmpty = pids.pop();
        if (maybeEmpty) {
            pids.push(maybeEmpty);
        }
        return this.update(pids);
    }

    update(newList: string[]) {
        const changeSet = {
            removed: [] as string[],
            added: [] as string[],
        };
        const newMap = new Set<string>();
        for (var pid of newList) {
            if (!this.pidMap.has(pid)) {
                changeSet.added.push(pid);
                this.emit('add', pid);
                newMap.add(pid);
            }
        }
        for (pid of this.pids) {
            if (!newMap.has(pid)) {
                changeSet.removed.push(pid);
                this.emit('remove', pid);
            }
        }
        this.pids = newList;
        this.pidMap = newMap;
        this.emit('changeSet', changeSet, newList);
        return this;
    }

    end() {
        this.abort.abort();
        return this;
    }
}

export default class TrackJdwpCommand extends Command {
    async execute(): Promise<Tracker | void> {
        this._send('track-jdwp');
        return this._readReply(() => new Tracker(this));
    }
}
