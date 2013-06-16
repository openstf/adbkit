Stream = require 'stream'
Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = require 'chai'

Tracker = require '../../src/adb/tracker'

describe 'Tracker', ->

  it "should emit 'add' when a device is added", (done) ->
    tracker = new Tracker
    spy = Sinon.spy()
    tracker.on 'add', spy
    device1 =
      id: 'a',
      type: 'device'
    device2 =
      id: 'b',
      type: 'device'
    tracker.update [device1, device2]
    expect(spy).to.have.been.calledTwice
    expect(spy).to.have.been.calledWith device1
    expect(spy).to.have.been.calledWith device2
    done()

  it "should emit 'remove' when a device is removed", (done) ->
    tracker = new Tracker
    spy = Sinon.spy()
    tracker.on 'remove', spy
    device1 =
      id: 'a',
      type: 'device'
    device2 =
      id: 'b',
      type: 'device'
    tracker.update [device1, device2]
    tracker.update [device1]
    expect(spy).to.have.been.calledOnce
    expect(spy).to.have.been.calledWith device2
    done()

  it "should emit 'change' when a device changes", (done) ->
    tracker = new Tracker
    spy = Sinon.spy()
    tracker.on 'change', spy
    deviceOld =
      id: 'a',
      type: 'device'
    deviceNew =
      id: 'a',
      type: 'offline'
    tracker.update [deviceOld]
    tracker.update [deviceNew]
    expect(spy).to.have.been.calledOnce
    expect(spy).to.have.been.calledWith deviceNew, deviceOld
    done()

  it "should emit 'changeSet' with all changes", (done) ->
    tracker = new Tracker
    spy = Sinon.spy()
    tracker.on 'changeSet', spy
    device1 =
      id: 'a',
      type: 'device'
    device2 =
      id: 'b',
      type: 'device'
    device3 =
      id: 'c',
      type: 'device'
    device3New =
      id: 'c',
      type: 'offline'
    device4 =
      id: 'd',
      type: 'offline'
    tracker.update [device1, device2, device3]
    tracker.update [device1, device3New, device4]
    expect(spy).to.have.been.calledTwice
    expect(spy).to.have.been.calledWith
      added: [device1, device2, device3]
      changed: []
      removed: []
    expect(spy).to.have.been.calledWith
      added: [device4]
      changed: [device3New]
      removed: [device2]
    done()
