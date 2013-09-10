{EventEmitter} = require 'events'
split = require 'split'

class ProcStat extends EventEmitter
  RE_COLSEP = /\ +/g
  RE_CPU = /^cpu[0-9]+$/

  constructor: (@sync) ->
    @interval = 1000
    @stats = this._emptyStats()
    @_ignore = {}
    @_timer = setInterval =>
      this.update()
    , @interval
    this.update()

  end: ->
    clearInterval @_timer
    @sync.end()
    @sync = null

  update: ->
    @sync.pull '/proc/stat', (err, stream) =>
      return this._error err if err
      this._parse stream

  _parse: (stream) ->
    stats = this._emptyStats()
    lines = stream.pipe split()
    lines.on 'data', (line) =>
      cols = line.split RE_COLSEP
      type = cols.shift()
      return if @_ignore[type] is line
      if RE_CPU.test type
        total = 0
        total += +val for val in cols
        stats.cpus[type] =
          line:      line
          user:      +cols[0] or 0
          nice:      +cols[1] or 0
          system:    +cols[2] or 0
          idle:      +cols[3] or 0
          iowait:    +cols[4] or 0
          irq:       +cols[5] or 0
          softirq:   +cols[6] or 0
          steal:     +cols[7] or 0
          guest:     +cols[8] or 0
          guestnice: +cols[9] or 0
          total:     total
    lines.on 'end', =>
      this._set stats

  _set: (stats) ->
    loads = {}
    found = false
    for id, cur of stats.cpus
      old = @stats.cpus[id]
      continue unless old
      ticks = cur.total - old.total
      if ticks > 0
        found = true
        # Calculate percentages for everything. For ease of formatting,
        # let's do `x / y * 100` as `100 / y * x`.
        m = 100 / ticks
        loads[id] =
          user:      Math.floor m * (cur.user - old.user)
          nice:      Math.floor m * (cur.nice - old.nice)
          system:    Math.floor m * (cur.system - old.system)
          idle:      Math.floor m * (cur.idle - old.idle)
          iowait:    Math.floor m * (cur.iowait - old.iowait)
          irq:       Math.floor m * (cur.irq - old.irq)
          softirq:   Math.floor m * (cur.softirq - old.softirq)
          steal:     Math.floor m * (cur.steal - old.steal)
          guest:     Math.floor m * (cur.guest - old.guest)
          guestnice: Math.floor m * (cur.guestnice - old.guestnice)
          total:     100
      else
        # The CPU is either offline (nothing was done) or it mysteriously
        # warped back in time (idle stat dropped significantly), causing the
        # total tick count to be <0. The latter seems to only happen on
        # Galaxy S4 so far. Either way we don't want those anomalies in our
        # stats. We'll also ignore the line in the next cycle. This doesn't
        # completely eliminate the anomalies, but it helps.
        @_ignore[id] = cur.line
        delete stats.cpus[id]
    this.emit 'load', loads if found
    @stats = stats

  _error: (err) ->
    this.emit 'error', err

  _emptyStats: ->
    cpus: {}

module.exports = ProcStat
