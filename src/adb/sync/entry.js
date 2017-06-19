// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const Stats = require('./stats')

class Entry extends Stats {
  constructor(name, mode, size, mtime) {
    super(mode, size, mtime)
    this.name = name
  }

  toString() {
    return this.name
  }
}

module.exports = Entry
