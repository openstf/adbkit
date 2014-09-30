class RollingCounter
  constructor: (@max, @min = 1) ->
    @now = @min

  next: ->
    @now = @min unless @now < @max
    return ++@now

module.exports = RollingCounter
