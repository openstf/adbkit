class ServiceMap
  constructor: ->
    @remotes = Object.create null
    @count = 0

  end: ->
    for remoteId, remote of @remotes
      remote.end()
    @remotes = Object.create null
    @count = 0
    return

  insert: (remoteId, socket) ->
    if @remotes[remoteId]
      throw new Error "Remote ID #{remoteId} is already being used"
    else
      @count += 1
      @remotes[remoteId] = socket

  get: (remoteId) ->
    @remotes[remoteId] or null

  remove: (remoteId) ->
    if remote = @remotes[remoteId]
      delete @remotes[remoteId]
      @count -= 1
      remote
    else
      null

module.exports = ServiceMap
