/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const Sinon = require('sinon');
const Chai = require('chai');
Chai.use(require('sinon-chai'));
const {expect} = Chai;

const MockConnection = require('../../../mock/connection');
const Protocol = require('../../../../src/adb/protocol');
const RemountCommand = require('../../../../src/adb/command/host-transport/remount');

describe('RemountCommand', () => it("should send 'remount:'", function(done) {
  const conn = new MockConnection;
  const cmd = new RemountCommand(conn);
  conn.socket.on('write', function(chunk) {
    expect(chunk.toString()).to.equal( 
      Protocol.encodeData('remount:').toString());
    conn.socket.causeRead(Protocol.OKAY);
    return conn.socket.causeEnd();
  });
  return cmd.execute()
    .then(() => done());
}));
