Promise = require 'bluebird'

Protocol = require './protocol'

class Parser
  class @FailError extends Error
    constructor: (message) ->
      Error.call this
      this.name = 'FailError'
      this.message = "Failure: '#{message}'"
      Error.captureStackTrace this, Parser.FailError

  class @PrematureEOFError extends Error
    constructor: (howManyMissing) ->
      Error.call this
      this.name = 'PrematureEOFError'
      this.message = "Premature end of stream, needed #{howManyMissing}
        more bytes"
      this.missingBytes = howManyMissing
      Error.captureStackTrace this, Parser.PrematureEOFError

  class @UnexpectedDataError extends Error
    constructor: (unexpected, expected) ->
      Error.call this
      this.name = 'UnexpectedDataError'
      this.message = "Unexpected '#{unexpected}', was expecting #{expected}"
      this.unexpected = unexpected
      this.expected = expected
      Error.captureStackTrace this, Parser.UnexpectedDataError

  constructor: (@stream) ->

  end: ->
    resolver = Promise.defer()

    tryRead = =>
      while @stream.read()
        continue
      return

    @stream.on 'readable', tryRead

    @stream.on 'error', errorListener = (err) ->
      resolver.reject err

    @stream.on 'end', endListener = ->
      resolver.resolve true

    @stream.read(0)
    @stream.end()

    resolver.promise.cancellable().finally =>
      @stream.removeListener 'readable', tryRead
      @stream.removeListener 'error', errorListener
      @stream.removeListener 'end', endListener

  raw: ->
    @stream

  readAll: ->
    all = new Buffer 0
    resolver = Promise.defer()

    tryRead = =>
      while chunk = @stream.read()
        all = Buffer.concat [all, chunk]

    @stream.on 'readable', tryRead

    @stream.on 'error', errorListener = (err) ->
      resolver.reject err

    @stream.on 'end', endListener = ->
      resolver.resolve all

    tryRead()

    resolver.promise.cancellable().finally =>
      @stream.removeListener 'readable', tryRead
      @stream.removeListener 'error', errorListener
      @stream.removeListener 'end', endListener

  readAscii: (howMany) ->
    this.readBytes howMany
      .then (chunk) ->
        chunk.toString 'ascii'

  readBytes: (howMany) ->
    resolver = Promise.defer()

    tryRead = =>
      if howMany
        if chunk = @stream.read howMany
          # If the stream ends while still having unread bytes, the read call
          # will ignore the limit and just return what it's got. There seem
          # to be some internal reasons for that madness but in the end it
          # means that we've got to handle it. Undocumented wonderful behavior
          # by the way.
          howMany -= chunk.length
          resolver.resolve chunk if howMany is 0
      else
        resolver.resolve new Buffer 0

    endListener = ->
      resolver.reject new Parser.PrematureEOFError howMany

    errorListener = (err) ->
      resolver.reject err

    @stream.on 'readable', tryRead
    @stream.on 'error', errorListener
    @stream.on 'end', endListener

    tryRead()

    resolver.promise.cancellable().finally =>
      @stream.removeListener 'readable', tryRead
      @stream.removeListener 'error', errorListener
      @stream.removeListener 'end', endListener

  # This is a bit of a hack right now, we're abusing promises like there was
  # no tomorrow. Let's try to replace this with perhaps a custom transform
  # stream at some point.
  readByteFlow: (howMany) ->
    resolver = Promise.defer()

    tryRead = =>
      if howMany
        # Try to get the exact amount we need first. If unsuccessful, take
        # whatever is available, which will be less than the needed amount.
        while chunk = @stream.read(howMany) or @stream.read()
          howMany -= chunk.length
          if howMany is 0
            resolver.progress chunk
            resolver.resolve()
            break
          resolver.progress chunk
      else
        resolver.resolve()

    endListener = ->
      resolver.reject new Parser.PrematureEOFError howMany

    errorListener = (err) ->
      resolver.reject err

    @stream.on 'readable', tryRead
    @stream.on 'error', errorListener
    @stream.on 'end', endListener

    tryRead()

    resolver.promise.cancellable().finally =>
      @stream.removeListener 'readable', tryRead
      @stream.removeListener 'error', errorListener
      @stream.removeListener 'end', endListener

  readError: ->
    this.readValue()
      .then (value) ->
        Promise.reject new Parser.FailError value.toString()

  readValue: ->
    this.readAscii 4
      .then (value) =>
        length = Protocol.decodeLength value
        this.readBytes length

  readUntil: (code) ->
    skipped = new Buffer 0
    read = =>
      this.readBytes 1
        .then (chunk) ->
          if chunk[0] is code
            skipped
          else
            skipped = Buffer.concat [skipped, chunk]
            read()
    read()

  searchLine: (re) ->
    this.readLine()
      .then (line) =>
        if match = re.exec line
          match
        else
          this.searchLine re

  readLine: ->
    this.readUntil 0x0a # '\n'
      .then (line) ->
        if line[line.length - 1] is 0x0d # '\r'
          line.slice 0, -1
        else
          line

  unexpected: (data, expected) ->
    Promise.reject new Parser.UnexpectedDataError data, expected

module.exports = Parser
