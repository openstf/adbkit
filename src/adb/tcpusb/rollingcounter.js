/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
class RollingCounter {
  constructor(max, min) {
    this.max = max;
    if (min == null) { min = 1; }
    this.min = min;
    this.now = this.min;
  }

  next() {
    if (!(this.now < this.max)) { this.now = this.min; }
    return ++this.now;
  }
}

module.exports = RollingCounter;
