/* eslint-disable
    no-cond-assign,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
const Promise = require('bluebird')

const Protocol = require('./protocol')

class Parser {
  constructor(stream) {
    this.stream = stream
    this.ended = false
  }

  end() {
    let endListener, errorListener
    if (this.ended) { return Promise.resolve(true) }

    const resolver = Promise.defer()

    const tryRead = () => {
      while (this.stream.read()) {
        continue
      }
    }

    this.stream.on('readable', tryRead)

    this.stream.on('error', (errorListener = err => resolver.reject(err))
    )

    this.stream.on('end', (endListener = () => {
      this.ended = true
      return resolver.resolve(true)
    })
    )

    this.stream.read(0)
    this.stream.end()

    return resolver.promise.cancellable().finally(() => {
      this.stream.removeListener('readable', tryRead)
      this.stream.removeListener('error', errorListener)
      return this.stream.removeListener('end', endListener)
    })
  }

  raw() {
    return this.stream
  }

  readAll() {
    let endListener, errorListener
    let all = new Buffer(0)
    const resolver = Promise.defer()

    const tryRead = () => {
      let chunk
      while ((chunk = this.stream.read())) {
        all = Buffer.concat([all, chunk])
      }
      if (this.ended) { return resolver.resolve(all) }
    }

    this.stream.on('readable', tryRead)

    this.stream.on('error', (errorListener = err => resolver.reject(err))
    )

    this.stream.on('end', (endListener = () => {
      this.ended = true
      return resolver.resolve(all)
    })
    )

    tryRead()

    return resolver.promise.cancellable().finally(() => {
      this.stream.removeListener('readable', tryRead)
      this.stream.removeListener('error', errorListener)
      return this.stream.removeListener('end', endListener)
    })
  }

  readAscii(howMany) {
    return this.readBytes(howMany)
      .then(chunk => chunk.toString('ascii'))
  }

  readBytes(howMany) {
    const resolver = Promise.defer()

    const tryRead = () => {
      if (howMany) {
        let chunk
        if (chunk = this.stream.read(howMany)) {
          // If the stream ends while still having unread bytes, the read call
          // will ignore the limit and just return what it's got.
          howMany -= chunk.length
          if (howMany === 0) { return resolver.resolve(chunk) }
        }
        if (this.ended) { return resolver.reject(new Parser.PrematureEOFError(howMany)) }
      } else {
        return resolver.resolve(new Buffer(0))
      }
    }

    const endListener = () => {
      this.ended = true
      return resolver.reject(new Parser.PrematureEOFError(howMany))
    }

    const errorListener = err => resolver.reject(err)

    this.stream.on('readable', tryRead)
    this.stream.on('error', errorListener)
    this.stream.on('end', endListener)

    tryRead()

    return resolver.promise.cancellable().finally(() => {
      this.stream.removeListener('readable', tryRead)
      this.stream.removeListener('error', errorListener)
      return this.stream.removeListener('end', endListener)
    })
  }

  readByteFlow(howMany, targetStream) {
    const resolver = Promise.defer()

    const tryRead = () => {
      if (howMany) {
        // Try to get the exact amount we need first. If unsuccessful, take
        // whatever is available, which will be less than the needed amount.
        let chunk
        while ((chunk = this.stream.read(howMany) || this.stream.read())) {
          howMany -= chunk.length
          targetStream.write(chunk)
          if (howMany === 0) { return resolver.resolve() }
        }
        if (this.ended) { return resolver.reject(new Parser.PrematureEOFError(howMany)) }
      } else {
        return resolver.resolve()
      }
    }

    const endListener = () => {
      this.ended = true
      return resolver.reject(new Parser.PrematureEOFError(howMany))
    }

    const errorListener = err => resolver.reject(err)

    this.stream.on('readable', tryRead)
    this.stream.on('error', errorListener)
    this.stream.on('end', endListener)

    tryRead()

    return resolver.promise.cancellable().finally(() => {
      this.stream.removeListener('readable', tryRead)
      this.stream.removeListener('error', errorListener)
      return this.stream.removeListener('end', endListener)
    })
  }

  readError() {
    return this.readValue()
      .then(value => Promise.reject(new Parser.FailError(value.toString())))
  }

  readValue() {
    return this.readAscii(4)
      .then(value => {
        const length = Protocol.decodeLength(value)
        return this.readBytes(length)
      })
  }

  readUntil(code) {
    let skipped = new Buffer(0)
    var read = () => {
      return this.readBytes(1)
        .then(function(chunk) {
          if (chunk[0] === code) {
            return skipped
          } else {
            skipped = Buffer.concat([skipped, chunk])
            return read()
          }
        })
    }
    return read()
  }

  searchLine(re) {
    return this.readLine()
      .then(line => {
        let match
        if ((match = re.exec(line))) {
          return match
        } else {
          return this.searchLine(re)
        }
      })
  }

  readLine() {
    return this.readUntil(0x0a) // '\n'
      .then(function(line) {
        if (line[line.length - 1] === 0x0d) { // '\r'
          return line.slice(0, -1)
        } else {
          return line
        }
      })
  }

  unexpected(data, expected) {
    return Promise.reject(new Parser.UnexpectedDataError(data, expected))
  }
}

Parser.FailError = class FailError extends Error {
  constructor(message) {
    super() // TODO check sanity
    Error.call(this)
    this.name = 'FailError'
    this.message = `Failure: '${message}'`
    Error.captureStackTrace(this, Parser.FailError)
  }
}

Parser.PrematureEOFError = class PrematureEOFError extends Error {
  constructor(howManyMissing) {
    super() // TODO check sanity
    Error.call(this)
    this.name = 'PrematureEOFError'
    this.message = `Premature end of stream, needed ${howManyMissing} \
more bytes`
    this.missingBytes = howManyMissing
    Error.captureStackTrace(this, Parser.PrematureEOFError)
  }
}

Parser.UnexpectedDataError = class UnexpectedDataError extends Error {
  constructor(unexpected, expected) {
    super() // TODO check sanity
    Error.call(this)
    this.name = 'UnexpectedDataError'
    this.message = `Unexpected '${unexpected}', was expecting ${expected}`
    this.unexpected = unexpected
    this.expected = expected
    Error.captureStackTrace(this, Parser.UnexpectedDataError)
  }
}

module.exports = Parser
