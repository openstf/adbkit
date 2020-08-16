/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const {EventEmitter} = require('events');

const Promise = require('bluebird');

const Command = require('../../command');
const Protocol = require('../../protocol');
const Parser = require('../../parser');

var TrackJdwpCommand = (function() {
  let Tracker = undefined;
  TrackJdwpCommand = class TrackJdwpCommand extends Command {
    static initClass() {
  
      Tracker = class Tracker extends EventEmitter {
        constructor(command) {
          {
            // Hack: trick Babel/TypeScript into allowing this before super.
            if (false) { super(); }
            let thisFn = (() => { return this; }).toString();
            let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
            eval(`${thisName} = this;`);
          }
          this.command = command;
          this.pids = [];
          this.pidMap = Object.create(null);
          this.reader = this.read()
            .catch(Parser.PrematureEOFError, err => {
              return this.emit('end');
          }).catch(Promise.CancellationError, err => {
              this.command.connection.end();
              return this.emit('end');
            }).catch(err => {
              this.command.connection.end();
              this.emit('error', err);
              return this.emit('end');
          });
        }
  
        read() {
          return this.command.parser.readValue()
            .cancellable()
            .then(list => {
              let maybeEmpty;
              const pids = list.toString().split('\n');
              if (maybeEmpty = pids.pop()) { pids.push(maybeEmpty); }
              return this.update(pids);
          });
        }
  
        update(newList) {
          let pid;
          const changeSet = {
            removed: [],
            added: []
          };
          const newMap = Object.create(null);
          for (pid of Array.from(newList)) {
            if (!this.pidMap[pid]) {
              changeSet.added.push(pid);
              this.emit('add', pid);
              newMap[pid] = pid;
            }
          }
          for (pid of Array.from(this.pids)) {
            if (!newMap[pid]) {
              changeSet.removed.push(pid);
              this.emit('remove', pid);
            }
          }
          this.pids = newList;
          this.pidMap = newMap;
          this.emit('changeSet', changeSet, newList);
          return this;
        }
  
        end() {
          this.reader.cancel();
          return this;
        }
      };
    }
    execute() {
      this._send('track-jdwp');
      return this.parser.readAscii(4)
        .then(reply => {
          switch (reply) {
            case Protocol.OKAY:
              return new Tracker(this);
            case Protocol.FAIL:
              return this.parser.readError();
            default:
              return this.parser.unexpected(reply, 'OKAY or FAIL');
          }
      });
    }
  };
  TrackJdwpCommand.initClass();
  return TrackJdwpCommand;
})();

module.exports = TrackJdwpCommand;
