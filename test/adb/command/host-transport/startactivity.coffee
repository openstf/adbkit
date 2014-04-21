Stream = require 'stream'
Sinon = require 'sinon'
Chai = require 'chai'
Chai.use require 'sinon-chai'
{expect} = Chai

MockConnection = require '../../../mock/connection'
Protocol = require '../../../../src/adb/protocol'
StartActivityCommand = require \
  '../../../../src/adb/command/host-transport/startactivity'

describe 'StartActivityCommand', ->

  it "should succeed when 'Success' returned", (done) ->
    conn = new MockConnection
    cmd = new StartActivityCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Success'
      conn.socket.causeEnd()
    options =
      component: 'com.dummy.component/.Main'
    cmd.execute options
      .then ->
        done()

  it "should fail when 'Error' returned", (done) ->
    conn = new MockConnection
    cmd = new StartActivityCommand conn
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Error: foo\n'
      conn.socket.causeEnd()
    options =
      component: 'com.dummy.component/.Main'
    cmd.execute options
      .catch (err) ->
        expect(err).to.be.be.an.instanceOf Error
        done()

  it "should send 'am start -n <pkg>'", (done) ->
    conn = new MockConnection
    cmd = new StartActivityCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData("shell:am start
          -n 'com.dummy.component/.Main'").toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Success\n'
      conn.socket.causeEnd()
    options =
      component: 'com.dummy.component/.Main'
    cmd.execute options
      .then ->
        done()

  it "should send 'am start -a <action>'", (done) ->
    conn = new MockConnection
    cmd = new StartActivityCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData("shell:am start
          -a 'foo.ACTION_BAR'").toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Success\n'
      conn.socket.causeEnd()
    options =
      action: "foo.ACTION_BAR"
    cmd.execute options
      .then ->
        done()

  it "should send 'am start -d <data>'", (done) ->
    conn = new MockConnection
    cmd = new StartActivityCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData("shell:am start
          -d 'foo://bar'").toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Success\n'
      conn.socket.causeEnd()
    options =
      data: "foo://bar"
    cmd.execute options
      .then ->
        done()

  it "should send 'am start -t <mimeType>'", (done) ->
    conn = new MockConnection
    cmd = new StartActivityCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData("shell:am start
          -t 'text/plain'").toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Success\n'
      conn.socket.causeEnd()
    options =
      mimeType: "text/plain"
    cmd.execute options
      .then ->
        done()

  it "should send 'am start -c <category>'", (done) ->
    conn = new MockConnection
    cmd = new StartActivityCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData("shell:am start
          -c 'android.intent.category.LAUNCHER'").toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Success\n'
      conn.socket.causeEnd()
    options =
      category: "android.intent.category.LAUNCHER"
    cmd.execute options
      .then ->
        done()

  it "should send 'am start -c <category1> -c <category2>'", (done) ->
    conn = new MockConnection
    cmd = new StartActivityCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData("shell:am start
          -c 'android.intent.category.LAUNCHER'
          -c 'android.intent.category.DEFAULT'").toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Success\n'
      conn.socket.causeEnd()
    options =
      category: [
        "android.intent.category.LAUNCHER"
        "android.intent.category.DEFAULT"
      ]
    cmd.execute options
      .then ->
        done()

  it "should send 'am start -f <flags>'", (done) ->
    conn = new MockConnection
    cmd = new StartActivityCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData("shell:am start
          -f #{0x10210000}").toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Success\n'
      conn.socket.causeEnd()
    options =
      flags: 0x10210000
    cmd.execute options
      .then ->
        done()

  it "should send 'am start -n <pgk> --es <extras>'", (done) ->
    conn = new MockConnection
    cmd = new StartActivityCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData("shell:am start
          --es 'key1' 'value1'
          --es 'key2' 'value2'
          -n 'com.dummy.component/.Main'").toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Success\n'
      conn.socket.causeEnd()
    options =
      component: "com.dummy.component/.Main"
      extras: [
        key: 'key1'
        value: 'value1'
      ,
        key: 'key2'
        value: 'value2'
      ]
    cmd.execute options
      .then ->
        done()

  it "should send 'am start -n <pgk> --ei <extras>'", (done) ->
    conn = new MockConnection
    cmd = new StartActivityCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData("shell:am start
          --ei 'key1' 1
          --ei 'key2' 2
          -n 'com.dummy.component/.Main'").toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Success\n'
      conn.socket.causeEnd()
    options =
      component: 'com.dummy.component/.Main'
      extras: [
        key: 'key1'
        value: 1
        type: 'int'
      ,
        key: 'key2'
        value: 2
        type: 'int'
      ]
    cmd.execute options
      .then ->
        done()

  it "should send 'am start -n <pgk> --ez <extras>'", (done) ->
    conn = new MockConnection
    cmd = new StartActivityCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData("shell:am start
          --ez 'key1' 'true'
          --ez 'key2' 'false'
          -n 'com.dummy.component/.Main'").toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Success'
      conn.socket.causeEnd()
    options =
      component: "com.dummy.component/.Main"
      extras: [
        key: 'key1'
        value: true
        type: 'bool'
      ,
        key: 'key2'
        value: false
        type: 'bool'
      ]
    cmd.execute options
      .then ->
        done()

  it "should send 'am start -n <pgk> --el <extras>'", (done) ->
    conn = new MockConnection
    cmd = new StartActivityCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData("shell:am start
          --el 'key1' 1
          --el 'key2' '2'
          -n 'com.dummy.component/.Main'").toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Success'
      conn.socket.causeEnd()
    options =
      component: 'com.dummy.component/.Main'
      extras: [
        key: 'key1'
        value: 1
        type: 'long'
      ,
        key: 'key2'
        value: '2'
        type: 'long'
      ]
    cmd.execute options
      .then ->
        done()

  it "should send 'am start -n <pgk> --eu <extras>'", (done) ->
    conn = new MockConnection
    cmd = new StartActivityCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData("shell:am start
          --eu 'key1' 'http://example.org'
          --eu 'key2' 'http://example.org'
          -n 'com.dummy.component/.Main'").toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Success'
      conn.socket.causeEnd()
    options =
      component: 'com.dummy.component/.Main'
      extras: [
        key: 'key1'
        value: 'http://example.org'
        type: 'uri'
      ,
        key: 'key2'
        value: 'http://example.org'
        type: 'uri'
      ]
    cmd.execute options
      .then ->
        done()

  it "should send 'am start -n <pgk> --es <extras>'", (done) ->
    conn = new MockConnection
    cmd = new StartActivityCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData("shell:am start
          --es 'key1' 'a'
          --es 'key2' 'b'
          -n 'com.dummy.component/.Main'").toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Success'
      conn.socket.causeEnd()
    options =
      component: 'com.dummy.component/.Main'
      extras: [
        key: 'key1'
        value: 'a'
        type: 'string'
      ,
        key: 'key2'
        value: 'b'
        type: 'string'
      ]
    cmd.execute options
      .then ->
        done()

  it "should send 'am start -n <pgk> --eia <extras with arr>'", (done) ->
    conn = new MockConnection
    cmd = new StartActivityCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData("shell:am start
          --eia 'key1' '2,3'
          --ela 'key2' '20,30'
          --ei 'key3' 5
          -n 'com.dummy.component/.Main'").toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Success'
      conn.socket.causeEnd()
    options =
      component: 'com.dummy.component/.Main'
      extras: [
        key: 'key1'
        value: [
          2
          3
        ]
        type: 'int'
      ,
        key: 'key2'
        value: [
          20
          30
        ]
        type: 'long'
      ,
        key: 'key3'
        value: 5
        type: 'int'
      ]
    cmd.execute options
      .then ->
        done()

  it "should send 'am start -n <pgk> --esn <extras>'", (done) ->
    conn = new MockConnection
    cmd = new StartActivityCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData("shell:am start
          --esn 'key1'
          --esn 'key2'
          -n 'com.dummy.component/.Main'").toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Success'
      conn.socket.causeEnd()
    options =
      component: 'com.dummy.component/.Main'
      extras: [
        key: 'key1'
        type: 'null'
      ,
        key: 'key2'
        type: 'null'
      ]
    cmd.execute options
      .then ->
        done()

  it "should throw when calling with an unknown extra type", (done) ->
    conn = new MockConnection
    cmd = new StartActivityCommand conn
    options =
      component: 'com.dummy.component/.Main'
      extras: [
        key: 'key1'
        value: 'value1'
        type: 'nonexisting'
      ]
    expect(-> cmd.execute(options, ->)).to.throw
    done()

  it "should accept mixed types of extras", (done) ->
    conn = new MockConnection
    cmd = new StartActivityCommand conn
    conn.socket.on 'write', (chunk) ->
      expect(chunk.toString()).to.equal \
        Protocol.encodeData("shell:am start
          --ez 'key1' 'true'
          --es 'key2' 'somestr'
          --es 'key3' 'defaultType'
          --ei 'key4' 3
          --el 'key5' '4'
          --eu 'key6' 'http://example.org'
          --esn 'key7'
          -n 'com.dummy.component/.Main'").toString()
    setImmediate ->
      conn.socket.causeRead Protocol.OKAY
      conn.socket.causeRead 'Success'
      conn.socket.causeEnd()
    options =
      component: 'com.dummy.component/.Main'
      extras: [
        key: 'key1'
        value: true
        type: 'bool'
      ,
        key: 'key2'
        value: 'somestr'
        type: 'string'
      ,
        key: 'key3'
        value: 'defaultType'
      ,
        key: 'key4'
        value: 3
        type: 'int'
      ,
        key: 'key5'
        value: '4'
        type: 'long'
      ,
        key: 'key6'
        value: 'http://example.org'
        type: 'uri'
      ,
        key: 'key7'
        type: 'null'
      ]
    cmd.execute options
      .then ->
        done()

  it "should map short extras to long extras", (done) ->
    conn = new MockConnection
    cmd = new StartActivityCommand conn
    short = cmd._formatExtras
      someString: 'bar'
      someInt: 5
      someUrl:
        type: 'uri'
        value: 'http://example.org'
      someArray:
        type: 'int'
        value: [1, 2]
      someNull: null
    long = cmd._formatExtras [
      key: 'someString'
      value: 'bar'
      type: 'string'
    ,
      key: 'someInt'
      value: 5
      type: 'int'
    ,
      key: 'someUrl'
      value: 'http://example.org'
      type: 'uri'
    ,
      key: 'someArray'
      value: [1, 2]
      type: 'int'
    ,
      key: 'someNull'
      type: 'null'
    ]
    expect(short).to.eql long
    done()
