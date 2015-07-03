fs = require 'fs'

if process.env.ADBKIT_DUMP
  out = fs.createWriteStream 'adbkit.dump'
  module.exports = (chunk) ->
    out.write chunk
    chunk
else
  module.exports = (chunk) -> chunk
