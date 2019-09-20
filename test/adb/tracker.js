var Chai, HostTrackDevicesCommand, Parser, Protocol, Sinon, Stream, Tracker, expect;

Stream = require('stream');

Sinon = require('sinon');

Chai = require('chai');

Chai.use(require('sinon-chai'));

expect = require('chai').expect;

Parser = require('../../src/adb/parser');

Tracker = require('../../src/adb/tracker');

Protocol = require('../../src/adb/protocol');

HostTrackDevicesCommand = require('../../src/adb/command/host/trackdevices');

describe('Tracker', function() {
  beforeEach(function() {
    this.writer = new Stream.PassThrough;
    this.conn = {
      parser: new Parser(this.writer),
      end: function() {}
    };
    this.cmd = new HostTrackDevicesCommand(this.conn);
    return this.tracker = new Tracker(this.cmd);
  });
  it("should emit 'add' when a device is added", function(done) {
    var device1, device2, spy;
    spy = Sinon.spy();
    this.tracker.on('add', spy);
    device1 = {
      id: 'a',
      type: 'device'
    };
    device2 = {
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
    var device1, device2, spy;
    spy = Sinon.spy();
    this.tracker.on('remove', spy);
    device1 = {
      id: 'a',
      type: 'device'
    };
    device2 = {
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
    var deviceNew, deviceOld, spy;
    spy = Sinon.spy();
    this.tracker.on('change', spy);
    deviceOld = {
      id: 'a',
      type: 'device'
    };
    deviceNew = {
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
    var device1, device2, device3, device3New, device4, spy;
    spy = Sinon.spy();
    this.tracker.on('changeSet', spy);
    device1 = {
      id: 'a',
      type: 'device'
    };
    device2 = {
      id: 'b',
      type: 'device'
    };
    device3 = {
      id: 'c',
      type: 'device'
    };
    device3New = {
      id: 'c',
      type: 'offline'
    };
    device4 = {
      id: 'd',
      type: 'offline'
    };
    this.tracker.update([device1, device2, device3]);
    this.tracker.update([device1, device3New, device4]);
    expect(spy).to.have.been.calledTwice;
    expect(spy).to.have.been.calledWith({
      added: [device1, device2, device3],
      changed: [],
      removed: []
    });
    expect(spy).to.have.been.calledWith({
      added: [device4],
      changed: [device3New],
      removed: [device2]
    });
    return done();
  });
  it("should emit 'error' and 'end' when connection ends", function(done) {
    this.tracker.on('error', (function(_this) {
      return function() {
        return _this.tracker.on('end', function() {
          return done();
        });
      };
    })(this));
    return this.writer.end();
  });
  it("should read devices from socket", function(done) {
    var device1, device2, device3, device3New, device4, spy;
    spy = Sinon.spy();
    this.tracker.on('changeSet', spy);
    device1 = {
      id: 'a',
      type: 'device'
    };
    device2 = {
      id: 'b',
      type: 'device'
    };
    device3 = {
      id: 'c',
      type: 'device'
    };
    device3New = {
      id: 'c',
      type: 'offline'
    };
    device4 = {
      id: 'd',
      type: 'offline'
    };
    this.writer.write(Protocol.encodeData("a\tdevice\nb\tdevice\nc\tdevice"));
    this.writer.write(Protocol.encodeData("a\tdevice\nc\toffline\nd\toffline"));
    return setTimeout(function() {
      expect(spy).to.have.been.calledTwice;
      expect(spy).to.have.been.calledWith({
        added: [device1, device2, device3],
        changed: [],
        removed: []
      });
      expect(spy).to.have.been.calledWith({
        added: [device4],
        changed: [device3New],
        removed: [device2]
      });
      return done();
    }, 10);
  });
  return describe('end()', function() {
    it("should close the connection", function(done) {
      Sinon.spy(this.conn.parser, 'end');
      this.tracker.on('end', (function(_this) {
        return function() {
          expect(_this.conn.parser.end).to.have.been.calledOnce;
          return done();
        };
      })(this));
      return this.tracker.end();
    });
    return it("should not cause an error to be emit", function(done) {
      var spy;
      spy = Sinon.spy();
      this.tracker.on('error', spy);
      this.tracker.on('end', function() {
        expect(spy).to.not.have.been.called;
        return done();
      });
      return this.tracker.end();
    });
  });
});
