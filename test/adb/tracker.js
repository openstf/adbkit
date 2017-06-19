const Stream = require('stream');
const Sinon = require('sinon');
const Chai = require('chai');
Chai.use(require('sinon-chai'));
const {expect} = require('chai');

const Parser = require('../../src/adb/parser');
const Tracker = require('../../src/adb/tracker');
const Protocol = require('../../src/adb/protocol');
const HostTrackDevicesCommand = require('../../src/adb/command/host/trackdevices');

describe('Tracker', function() {

  beforeEach(function() {
    this.writer = new Stream.PassThrough;
    this.conn = {
      parser: new Parser(this.writer),
      end() {}
    };
    this.cmd = new HostTrackDevicesCommand(this.conn);
    return this.tracker = new Tracker(this.cmd);
  });

  it("should emit 'add' when a device is added", function(done) {
    const spy = Sinon.spy();
    this.tracker.on('add', spy);
    const device1 = {
      id: 'a',
      type: 'device'
    };
    const device2 = {
      id: 'b',
      type: 'device'
    };
    this.tracker.update([device1, device2]);
    expect(spy).to.have.been.calledTwice;
    expect(spy).to.have.been.calledWith(device1);
    expect(spy).to.have.been.calledWith(device2);
    return done();
  });

  it("should emit 'remove' when a device is removed", function(done) {
    const spy = Sinon.spy();
    this.tracker.on('remove', spy);
    const device1 = {
      id: 'a',
      type: 'device'
    };
    const device2 = {
      id: 'b',
      type: 'device'
    };
    this.tracker.update([device1, device2]);
    this.tracker.update([device1]);
    expect(spy).to.have.been.calledOnce;
    expect(spy).to.have.been.calledWith(device2);
    return done();
  });

  it("should emit 'change' when a device changes", function(done) {
    const spy = Sinon.spy();
    this.tracker.on('change', spy);
    const deviceOld = {
      id: 'a',
      type: 'device'
    };
    const deviceNew = {
      id: 'a',
      type: 'offline'
    };
    this.tracker.update([deviceOld]);
    this.tracker.update([deviceNew]);
    expect(spy).to.have.been.calledOnce;
    expect(spy).to.have.been.calledWith(deviceNew, deviceOld);
    return done();
  });

  it("should emit 'changeSet' with all changes", function(done) {
    const spy = Sinon.spy();
    this.tracker.on('changeSet', spy);
    const device1 = {
      id: 'a',
      type: 'device'
    };
    const device2 = {
      id: 'b',
      type: 'device'
    };
    const device3 = {
      id: 'c',
      type: 'device'
    };
    const device3New = {
      id: 'c',
      type: 'offline'
    };
    const device4 = {
      id: 'd',
      type: 'offline'
    };
    this.tracker.update([device1, device2, device3]);
    this.tracker.update([device1, device3New, device4]);
    expect(spy).to.have.been.calledTwice;
    expect(spy).to.have.been.calledWith({
      added: [device1, device2, device3],
      changed: [],
      removed: []});
    expect(spy).to.have.been.calledWith({
      added: [device4],
      changed: [device3New],
      removed: [device2]});
    return done();
  });

  it("should emit 'error' and 'end' when connection ends", function(done) {
    this.tracker.on('error', () => {
      return this.tracker.on('end', () => done());
    });
    return this.writer.end();
  });

  it("should read devices from socket", function(done) {
    const spy = Sinon.spy();
    this.tracker.on('changeSet', spy);
    const device1 = {
      id: 'a',
      type: 'device'
    };
    const device2 = {
      id: 'b',
      type: 'device'
    };
    const device3 = {
      id: 'c',
      type: 'device'
    };
    const device3New = {
      id: 'c',
      type: 'offline'
    };
    const device4 = {
      id: 'd',
      type: 'offline'
    };
    this.writer.write(Protocol.encodeData(`\
a\tdevice
b\tdevice
c\tdevice\
`
    )
    );
    this.writer.write(Protocol.encodeData(`\
a\tdevice
c\toffline
d\toffline\
`
    )
    );
    return setImmediate(function() {
      expect(spy).to.have.been.calledTwice;
      expect(spy).to.have.been.calledWith({
        added: [device1, device2, device3],
        changed: [],
        removed: []});
      expect(spy).to.have.been.calledWith({
        added: [device4],
        changed: [device3New],
        removed: [device2]});
      return done();
    });
  });

  return describe('end()', function() {

    it("should close the connection", function(done) {
      Sinon.spy(this.conn.parser, 'end');
      this.tracker.on('end', () => {
        expect(this.conn.parser.end).to.have.been.calledOnce;
        return done();
      });
      return this.tracker.end();
    });

    return it("should not cause an error to be emit", function(done) {
      const spy = Sinon.spy();
      this.tracker.on('error', spy);
      this.tracker.on('end', function() {
        expect(spy).to.not.have.been.called;
        return done();
      });
      return this.tracker.end();
    });
  });
});
