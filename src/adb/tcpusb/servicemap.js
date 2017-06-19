/* eslint-disable
    no-cond-assign,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
class ServiceMap {
  constructor() {
    this.remotes = Object.create(null)
    this.count = 0
  }

  end() {
    for (let remoteId in this.remotes) {
      const remote = this.remotes[remoteId]
      remote.end()
    }
    this.remotes = Object.create(null)
    this.count = 0
  }

  insert(remoteId, socket) {
    if (this.remotes[remoteId]) {
      throw new Error(`Remote ID ${remoteId} is already being used`)
    } else {
      this.count += 1
      return this.remotes[remoteId] = socket
    }
  }

  get(remoteId) {
    return this.remotes[remoteId] || null
  }

  remove(remoteId) {
    let remote
    if (remote = this.remotes[remoteId]) {
      delete this.remotes[remoteId]
      this.count -= 1
      return remote
    } else {
      return null
    }
  }
}

module.exports = ServiceMap
