/* eslint-disable
    no-cond-assign,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
const {EventEmitter} = require('events')

const Promise = require('bluebird')

const Command = require('../../command')
const Protocol = require('../../protocol')
const Parser = require('../../parser')

var TrackJdwpCommand = (function() {
  let Tracker = undefined
  TrackJdwpCommand = class TrackJdwpCommand extends Command {
    static initClass() {
  
      Tracker = class Tracker extends EventEmitter {
        constructor(command) {
          super()
          this.command = command
          this.pids = []
          this.pidMap = Object.create(null)
          this.reader = this.read()
            .catch(Parser.PrematureEOFError, err => {
              return this.emit('end')
            }).catch(Promise.CancellationError, err => {
              this.command.connection.end()
              return this.emit('end')
            }).catch(err => {
              this.command.connection.end()
              this.emit('error', err)
              return this.emit('end')
            })
        }
  
        read() {
          return this.command.parser.readValue()
            .cancellable()
            .then(list => {
              let maybeEmpty
              const pids = list.toString().split('\n')
              if (maybeEmpty = pids.pop()) { pids.push(maybeEmpty) }
              return this.update(pids)
            })
        }
  
        update(newList) {
          const changeSet = {
            removed: [],
            added: []
          }
          const newMap = Object.create(null)
          for (var pid of newList) {
            if (!this.pidMap[pid]) {
              changeSet.added.push(pid)
              this.emit('add', pid)
              newMap[pid] = pid
            }
          }
          for (pid of this.pids) {
            if (!newMap[pid]) {
              changeSet.removed.push(pid)
              this.emit('remove', pid)
            }
          }
          this.pids = newList
          this.pidMap = newMap
          this.emit('changeSet', changeSet, newList)
          return this
        }
  
        end() {
          this.reader.cancel()
          return this
        }
      }
    }
    execute() {
      this._send('track-jdwp')
      return this.parser.readAscii(4)
        .then(reply => {
          switch (reply) {
          case Protocol.OKAY:
            return new Tracker(this)
          case Protocol.FAIL:
            return this.parser.readError()
          default:
            return this.parser.unexpected(reply, 'OKAY or FAIL')
          }
        })
    }
  }
  TrackJdwpCommand.initClass()
  return TrackJdwpCommand
})()

module.exports = TrackJdwpCommand
