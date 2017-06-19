// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const Command = require('../../command')
const Protocol = require('../../protocol')

var GetFeaturesCommand = (function() {
  let RE_FEATURE = undefined
  GetFeaturesCommand = class GetFeaturesCommand extends Command {
    static initClass() {
      RE_FEATURE = /^feature:(.*?)(?:=(.*?))?\r?$/gm
    }

    execute() {
      this._send('shell:pm list features 2>/dev/null')
      return this.parser.readAscii(4)
        .then(reply => {
          switch (reply) {
          case Protocol.OKAY:
            return this.parser.readAll()
              .then(data => {
                return this._parseFeatures(data.toString())
              })
          case Protocol.FAIL:
            return this.parser.readError()
          default:
            return this.parser.unexpected(reply, 'OKAY or FAIL')
          }
        })
    }

    _parseFeatures(value) {
      let match
      const features = {}
      while ((match = RE_FEATURE.exec(value))) {
        features[match[1]] = match[2] || true
      }
      return features
    }
  }
  GetFeaturesCommand.initClass()
  return GetFeaturesCommand
})()

module.exports = GetFeaturesCommand
