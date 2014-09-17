Parser = require './parser'

module.exports.readAll = (stream, callback) ->
  new Parser(stream).readAll stream
    .nodeify callback
