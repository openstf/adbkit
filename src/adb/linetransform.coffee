Stream = require 'stream'

class LineTransform extends Stream.Transform
  constructor: (options) ->
    @savedR = null
    super options

  # Sadly, the ADB shell is not very smart. It automatically converts every
  # 0x0a ('\n') it can find to 0x0d 0x0a ('\r\n'). This also applies to binary
  # content. We could get rid of this behavior by setting `stty raw`, but
  # unfortunately it's not available by default (you'd have to install busybox)
  # or something similar. On the up side, it really does do this for all line
  # feeds, so a simple transform works fine.
  _transform: (chunk, encoding, done) ->
    lo = 0
    hi = 0
    if @savedR
      this.push @savedR unless chunk[0] is 0x0a
      @savedR = null
    last = chunk.length - 1
    while hi <= last
      if chunk[hi] is 0x0d
        if hi is last
          @savedR = chunk.slice last
          break # Stop hi from incrementing, we want to skip the last byte.
        else if chunk[hi + 1] is 0x0a
          this.push chunk.slice lo, hi
          lo = hi + 1
      hi += 1
    unless hi is lo
      this.push chunk.slice lo, hi
    done()
    return

  # When the stream ends on an '\r', output it as-is (assume binary data).
  _flush: (done) ->
    this.push @savedR if @savedR
    done()

module.exports = LineTransform
