Stats = require './stats'

class Entry extends Stats
  constructor: (name, mode, size, mtime) ->
    super mode, size, mtime
    @name = name

  toString: ->
    @name

module.exports = Entry
