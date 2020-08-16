/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const {EventEmitter} = require('events');
const split = require('split');

const Parser = require('../parser');

var ProcStat = (function() {
  let RE_CPULINE = undefined;
  let RE_COLSEP = undefined;
  ProcStat = class ProcStat extends EventEmitter {
    static initClass() {
      RE_CPULINE = /^cpu[0-9]+ .*$/mg;
      RE_COLSEP = /\ +/g;
    }

    constructor(sync) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { return this; }).toString();
        let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
        eval(`${thisName} = this;`);
      }
      this.sync = sync;
      this.interval = 1000;
      this.stats = this._emptyStats();
      this._ignore = {};
      this._timer = setInterval(() => {
        return this.update();
      }
      , this.interval);
      this.update();
    }

    end() {
      clearInterval(this._timer);
      this.sync.end();
      return this.sync = null;
    }

    update() {
      return new Parser(this.sync.pull('/proc/stat'))
        .readAll()
        .then(out => {
          return this._parse(out);
      }).catch(err => {
          this._error(err);
      });
    }

    _parse(out) {
      let match;
      const stats = this._emptyStats();
      while ((match = RE_CPULINE.exec(out))) {
        const line = match[0];
        const cols = line.split(RE_COLSEP);
        const type = cols.shift();
        if (this._ignore[type] === line) { continue; }
        let total = 0;
        for (let val of Array.from(cols)) { total += +val; }
        stats.cpus[type] = {
          line,
          user:      +cols[0] || 0,
          nice:      +cols[1] || 0,
          system:    +cols[2] || 0,
          idle:      +cols[3] || 0,
          iowait:    +cols[4] || 0,
          irq:       +cols[5] || 0,
          softirq:   +cols[6] || 0,
          steal:     +cols[7] || 0,
          guest:     +cols[8] || 0,
          guestnice: +cols[9] || 0,
          total
        };
      }
      return this._set(stats);
    }

    _set(stats) {
      const loads = {};
      let found = false;
      for (let id in stats.cpus) {
        const cur = stats.cpus[id];
        const old = this.stats.cpus[id];
        if (!old) { continue; }
        const ticks = cur.total - old.total;
        if (ticks > 0) {
          found = true;
          // Calculate percentages for everything. For ease of formatting,
          // let's do `x / y * 100` as `100 / y * x`.
          const m = 100 / ticks;
          loads[id] = {
            user:      Math.floor(m * (cur.user - old.user)),
            nice:      Math.floor(m * (cur.nice - old.nice)),
            system:    Math.floor(m * (cur.system - old.system)),
            idle:      Math.floor(m * (cur.idle - old.idle)),
            iowait:    Math.floor(m * (cur.iowait - old.iowait)),
            irq:       Math.floor(m * (cur.irq - old.irq)),
            softirq:   Math.floor(m * (cur.softirq - old.softirq)),
            steal:     Math.floor(m * (cur.steal - old.steal)),
            guest:     Math.floor(m * (cur.guest - old.guest)),
            guestnice: Math.floor(m * (cur.guestnice - old.guestnice)),
            total:     100
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
      if (found) { this.emit('load', loads); }
      return this.stats = stats;
    }

    _error(err) {
      return this.emit('error', err);
    }

    _emptyStats() {
      return {cpus: {}};
    }
  };
  ProcStat.initClass();
  return ProcStat;
})();

module.exports = ProcStat;
