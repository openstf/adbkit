Stream = require 'stream'

class LineTransform extends Stream.Transform
  constructor: (options = {}) ->
    autoDetect = options.autoDetect or false
    delete options.autoDetect
    super options
    @savedR = null
    @autoDetect = autoDetect
    @transformNeeded = true
    @skipBytes = 0

  _nullTransform: (chunk, encoding, done) ->
    this.push chunk
    done()
    return

  # Sadly, the ADB shell is not very smart. It automatically converts every
  # 0x0a ('\n') it can find to 0x0d 0x0a ('\r\n'). This also applies to binary
  # content. We could get rid of this behavior by setting `stty raw`, but
  # unfortunately it's not available by default (you'd have to install busybox)
  # or something similar. On the up side, it really does do this for all line
  # feeds, so a simple transform works fine.
  _transform: (chunk, encoding, done) ->
    # If auto detection is enabled, check the first byte. The first two
    # bytes must be either 0x0a .. or 0x0d 0x0a. This causes a need to skip
    # either one or two bytes. The autodetection runs only once.
    if @autoDetect
      if chunk[0] is 0x0a
        @transformNeeded = false
        @skipBytes = 1
      else
        @skipBytes = 2
      @autoDetect = false

    # It's technically possible that we may receive the first two bytes
    # in two separate chunks. That's why the autodetect bytes are skipped
    # here, separately.
    if @skipBytes
      skip = Math.min chunk.length, @skipBytes
      chunk = chunk.slice skip
      @skipBytes -= skip

    # It's possible that skipping bytes has created an empty chunk.
    return done() unless chunk.length

    # At this point all bytes that needed to be skipped should have been
    # skipped. If transform is not needed, shortcut to null transform.
    return this._nullTransform(chunk, encoding, done) unless @transformNeeded

    # Ok looks like we're transforming.
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
