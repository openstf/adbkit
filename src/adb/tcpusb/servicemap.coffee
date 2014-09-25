class ServiceMap
  constructor: ->
    @remotes = Object.create null

  end: ->
    for remoteId, remote of @remotes
      remote.end()
    @remotes = Object.create null
    return

  put: (remoteId, socket) ->
    @remotes[remoteId] = socket

  get: (remoteId) ->
    @remotes[remoteId] or null

  remove: (remoteId) ->
    if remote = @remotes[remoteId]
      delete @remotes[remoteId]
      remote
    else
      null

module.exports = ServiceMap
