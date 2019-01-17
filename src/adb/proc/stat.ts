/* eslint-disable
    no-unused-vars,
    no-useless-escape,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
import { EventEmitter } from 'events';

import Parser from '../parser';
import Sync from '../sync';

let RE_CPULINE = /^cpu[0-9]+ .*$/gm;
let RE_COLSEP = /\ +/g;

interface Load {
    user: number;
    nice: number;
    system: number;
    idle: number;
    iowait: number;
    irq: number;
    softirq: number;
    steal: number;
    guest: number;
    guestnice: number;
    total: number;
}

interface Stats {
    cpus: {
        [type: string]: Load & {
            line: string;
        };
    };
}

export default class ProcStat extends EventEmitter {
    interval = 1000;
    stats = this._emptyStats();
    _ignore: { [type: string]: any } = {};
    _timer = setInterval(() => this.update(), this.interval);

    constructor(public sync: Sync | null) {
        super();
        this.update();
    }

    end() {
        clearInterval(this._timer);
        this.sync!.end();
        this.sync = null;
    }

    async update() {
        try {
            const out = await new Parser(this.sync!.pull(
                '/proc/stat',
            ) as any).readAll();
            await this._parse(out);
        } catch (err) {
            this._error(err);
        }
    }

    _parse(out: Buffer) {
        const match = RE_CPULINE.exec(out.toString());
        const stats = this._emptyStats();
        while (match) {
            const line = match[0];
            const cols = line.split(RE_COLSEP);
            const type = cols.shift()!;
            if (this._ignore[type] === line) {
                continue;
            }
            let total = 0;
            for (let val of cols) {
                total += +val;
            }
            stats.cpus[type] = {
                line,
                user: +cols[0] || 0,
                nice: +cols[1] || 0,
                system: +cols[2] || 0,
                idle: +cols[3] || 0,
                iowait: +cols[4] || 0,
                irq: +cols[5] || 0,
                softirq: +cols[6] || 0,
                steal: +cols[7] || 0,
                guest: +cols[8] || 0,
                guestnice: +cols[9] || 0,
                total,
            };
        }
        return this._set(stats);
    }

    _set(stats: Stats) {
        const loads: { [id: string]: Load } = {};
        let found = false;
        for (let id in stats.cpus) {
            const cur = stats.cpus[id];
            const old = this.stats.cpus[id];
            if (!old) {
                continue;
            }
            const ticks = cur.total - old.total;
            if (ticks > 0) {
                found = true;
                // Calculate percentages for everything. For ease of formatting,
                // let's do `x / y * 100` as `100 / y * x`.
                const m = 100 / ticks;
                loads[id] = {
                    user: Math.floor(m * (cur.user - old.user)),
                    nice: Math.floor(m * (cur.nice - old.nice)),
                    system: Math.floor(m * (cur.system - old.system)),
                    idle: Math.floor(m * (cur.idle - old.idle)),
                    iowait: Math.floor(m * (cur.iowait - old.iowait)),
                    irq: Math.floor(m * (cur.irq - old.irq)),
                    softirq: Math.floor(m * (cur.softirq - old.softirq)),
                    steal: Math.floor(m * (cur.steal - old.steal)),
                    guest: Math.floor(m * (cur.guest - old.guest)),
                    guestnice: Math.floor(m * (cur.guestnice - old.guestnice)),
                    total: 100,
                };
            } else {
                // The CPU is either offline (nothing was done) or it mysteriously
                // warped back in time (idle stat dropped significantly), causing the
                // total tick count to be <0. The latter seems to only happen on
                // Galaxy S4 so far. Either way we don't want those anomalies in our
                // stats. We'll also ignore the line in the next cycle. This doesn't
                // completely eliminate the anomalies, but it helps.
                this._ignore[id] = cur.line;
                delete stats.cpus[id];
            }
        }
        if (found) {
            this.emit('load', loads);
        }
        this.stats = stats;
        return stats;
    }

    _error(err: any) {
        return this.emit('error', err);
    }

    _emptyStats(): Stats {
        return { cpus: {} };
    }
}
