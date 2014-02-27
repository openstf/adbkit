Stream = require 'stream'
Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = Chai

MockConnection = require '../../../mock/connection'
Protocol = require '../../../../src/adb/protocol'
StartActivityCommand = require '../../../../src/adb/command/host-transport/startactivity'

describe 'StartActivityCommand', ->
  it "should send 'am start -n <pkg>'", (done) ->
    conn = new MockConnection
    cmd = new StartActivityCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('shell:am start -n com.dummy.component/.Main').toString()
    conn.socket.causeRead Protocol.OKAY
    conn.socket.causeRead 'Success'
    conn.socket.causeEnd()
    options =
      component: "com.dummy.component/.Main"
    cmd.execute options, (err) ->
      expect(err).to.be.null
      done()


  it "should send 'am start -a <action>'", (done) ->
    conn = new MockConnection
    cmd = new StartActivityCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('shell:am start -a {someaction}').toString()
    conn.socket.causeRead Protocol.OKAY
    conn.socket.causeRead 'Success'
    conn.socket.causeEnd()
    options =
      action: "{someaction}"
    cmd.execute options, (err) ->
      expect(err).to.be.null
      done()

  it "should send 'am start -n <pgk> -e <extras>'", (done) ->
    conn = new MockConnection
    cmd = new StartActivityCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData('shell:am start -e key1 value1 -e key2 value2 -n com.dummy.component/.Main').toString()
    conn.socket.causeRead Protocol.OKAY
    conn.socket.causeRead 'Success'
    conn.socket.causeEnd()
    options =
      component: "com.dummy.component/.Main"
      extras: [
        {
          key: "key1"
          value: "value1"
        }
        {
          key: "key2"
          value: "value2"
        }
      ]

    cmd.execute options, (err) ->
      expect(err).to.be.null
      done()

  describe "should send 'am start with extras, type and array", ->
    it "should send 'am start -n <pgk> -ei <extras>'", (done) ->
      conn = new MockConnection
      cmd = new StartActivityCommand conn
      conn.socket.on 'write', (chunk) ->
        expected = 'shell:am start -ei key1 1 -ei key2 2 -n '
        expected += 'com.dummy.component/.Main'
        expect(chunk.toString()).to.equal \
          Protocol.encodeData(expected).toString()
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Success'
      conn.socket.causeEnd()
      options =
        component: "com.dummy.component/.Main"
        extras: [
          {
            key: "key1"
            value: "1"
            type: "int"
          }
          {
            key: "key2"
            value: "2"
            type: "int"
          }
        ]

      cmd.execute options, (err) ->
        expect(err).to.be.null
        done()

    it "should send 'am start -n <pgk> -ez <extras>'", (done) ->
      conn = new MockConnection
      cmd = new StartActivityCommand conn
      conn.socket.on 'write', (chunk) ->
        expected = 'shell:am start -ez key1 true -ez key2 false -ez key3 '
        expected += 'true -ez key4 false -n com.dummy.component/.Main'
        expect(chunk.toString()).to.equal \
          Protocol.encodeData(expected).toString()
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Success'
      conn.socket.causeEnd()
      options =
        component: "com.dummy.component/.Main"
        extras: [
          {
            key: "key1"
            value: true
            type: "bool"
          }
          {
            key: "key2"
            value: false
            type: "bool"
          }
          {
            key: "key3"
            value: "true"
            type: "bool"
          }
          {
            key: "key4"
            value: "false"
            type: "bool"
          }
        ]

      cmd.execute options, (err) ->
        expect(err).to.be.null
        done()

    it "should send 'am start -n <pgk> -el <extras>'", (done) ->
      conn = new MockConnection
      cmd = new StartActivityCommand conn
      conn.socket.on 'write', (chunk) ->
        expected = 'shell:am start -el key1 1 '
        expected += '-el key2 2 -n com.dummy.component/.Main'
        expect(chunk.toString()).to.equal \
          Protocol.encodeData(expected).toString()
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Success'
      conn.socket.causeEnd()
      options =
        component: "com.dummy.component/.Main"
        extras: [
          {
            key: "key1"
            value: "1"
            type: "long"
          }
          {
            key: "key2"
            value: "2"
            type: "long"
          }
        ]

      cmd.execute options, (err) ->
        expect(err).to.be.null
        done()

    it "should send 'am start -n <pgk> -eu <extras>'", (done) ->
      conn = new MockConnection
      cmd = new StartActivityCommand conn
      conn.socket.on 'write', (chunk) ->
        expected = 'shell:am start -eu key1 www.value1.com '
        expected += '-eu key2 www.value2.com -n com.dummy.component/.Main'
        expect(chunk.toString()).to.equal \
          Protocol.encodeData(expected).toString()
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Success'
      conn.socket.causeEnd()
      options =
        component: "com.dummy.component/.Main"
        extras: [
          {
            key: "key1"
            value: "www.value1.com"
            type: "uri"
          }
          {
            key: "key2"
            value: "www.value2.com"
            type: "uri"
          }
        ]

      cmd.execute options, (err) ->
        expect(err).to.be.null
        done()

    it "should send 'am start -n <pgk> -es <extras>'", (done) ->
      conn = new MockConnection
      cmd = new StartActivityCommand conn
      conn.socket.on 'write', (chunk) ->
        expected = 'shell:am start -es key1 a '
        expected += '-es key2 b -n com.dummy.component/.Main'
        expect(chunk.toString()).to.equal \
          Protocol.encodeData(expected).toString()
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Success'
      conn.socket.causeEnd()
      options =
        component: "com.dummy.component/.Main"
        extras: [
          {
            key: "key1"
            value: "a"
            type: "string"
          }
          {
            key: "key2"
            value: "b"
            type: "string"
          }
        ]

      cmd.execute options, (err) ->
        expect(err).to.be.null
        done()

    it "should send 'am start -n <pgk> -eia <extras with arr>'", (done) ->
      conn = new MockConnection
      cmd = new StartActivityCommand conn
      conn.socket.on 'write', (chunk) ->
        expected = 'shell:am start -eia key1 2,3 '
        expected += '-ela key2 20,30 '
        expected += '-ei key3 5 -n com.dummy.component/.Main'
        expect(chunk.toString()).to.equal \
          Protocol.encodeData(expected).toString()
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Success'
      conn.socket.causeEnd()
      options =
        component: "com.dummy.component/.Main"
        extras: [
          {
            key: "key1"
            values: [
              2
              3
              ]
            type: "int"
            isArray: true
          }
          {
            key: "key2"
            values: [
              20
              30
            ]
            type: "long"
            isArray: true
          }
          {
            key: "key3"
            value: 5
            type: "int"
            isArray: false
          }
        ]

      cmd.execute options, (err) ->
        expect(err).to.be.null
        done()




    it "should send 'am start -n <pgk> -en <extras>'", (done) ->
      conn = new MockConnection
      cmd = new StartActivityCommand conn
      conn.socket.on 'write', (chunk) ->
        expected = 'shell:am start -en key1  '
        expected += '-en key2  -n com.dummy.component/.Main'
        expect(chunk.toString()).to.equal \
          Protocol.encodeData(expected).toString()
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Success'
      conn.socket.causeEnd()
      options =
        component: "com.dummy.component/.Main"
        extras: [
          {
            key: "key1"
            type: "novalue"
          }
          {
            key: "key2"
            type: "novalue"
          }
        ]

      cmd.execute options, (err) ->
        expect(err).to.be.null
        done()

    it "should throw exception for parameter novalue with values", (done) ->
      conn = new MockConnection
      cmd = new StartActivityCommand conn

      options =
        component: "com.dummy.component/.Main"
        extras: [
          {
            key: "key1"
            value: "value1"
            type: "novalue"
          }
        ]

      cmd.execute options, (err) ->
        expect(err).to.be.an.instanceOf Error
        done()

    it "calling with an unknown extra types", (done) ->
      conn = new MockConnection
      cmd = new StartActivityCommand conn

      options =
        component: "com.dummy.component/.Main"
        extras: [
          {
            key: "key1"
            value: "value1"
            type: "nonexisting"
          }
        ]

      cmd.execute options, (err) ->
        expect(err).to.be.an.instanceOf Error
        done()

    it "mixed type of extras", (done) ->
      conn = new MockConnection
      cmd = new StartActivityCommand conn
      conn.socket.on 'write', (chunk) ->
        expected = 'shell:am start -ez key1 true '
        expected += '-es key2 somestr -e key3 defaultType '
        expected += '-ei key4 3 -el key5 4 -eu key6 www.uri.com '
        expected += '-en key7  -n com.dummy.component/.Main'
        expect(chunk.toString()).to.equal \
          Protocol.encodeData(expected).toString()
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Success'
      conn.socket.causeEnd()
      options =
        component: "com.dummy.component/.Main"
        extras: [
          {
            key: "key1"
            value: true
            type: "bool"
          }
          {
            key: "key2"
            value: "somestr"
            type: "string"
          }
          {
            key: "key3"
            value: "defaultType"
          }
          {
            key: "key4"
            value: 3
            type: "int"
          }
          {
            key: "key5"
            value: "4"
            type: "long"
          }
          {
            key: "key6"
            value: "www.uri.com"
            type: "uri"
          }
          {
            key: "key7"
            type: "novalue"
          }
        ]

      cmd.execute options, (err) ->
        console.log(err)
        expect(err).to.be.null
        done()



