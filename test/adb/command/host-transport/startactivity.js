var Chai, MockConnection, Protocol, Sinon, StartActivityCommand, Stream, expect;

Stream = require('stream');

Sinon = require('sinon');

Chai = require('chai');

Chai.use(require('sinon-chai'));

expect = Chai.expect;

MockConnection = require('../../../mock/connection');

Protocol = require('../../../../src/adb/protocol');

StartActivityCommand = require('../../../../src/adb/command/host-transport/startactivity');

describe('StartActivityCommand', function() {
  it("should succeed when 'Success' returned", function(done) {
    var cmd, conn, options;
    conn = new MockConnection;
    cmd = new StartActivityCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('Success');
      return conn.socket.causeEnd();
    });
    options = {
      component: 'com.dummy.component/.Main'
    };
    return cmd.execute(options).then(function() {
      return done();
    });
  });
  it("should fail when 'Error' returned", function(done) {
    var cmd, conn, options;
    conn = new MockConnection;
    cmd = new StartActivityCommand(conn);
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('Error: foo\n');
      return conn.socket.causeEnd();
    });
    options = {
      component: 'com.dummy.component/.Main'
    };
    return cmd.execute(options)["catch"](function(err) {
      expect(err).to.be.be.an.instanceOf(Error);
      return done();
    });
  });
  it("should send 'am start -n <pkg>'", function(done) {
    var cmd, conn, options;
    conn = new MockConnection;
    cmd = new StartActivityCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData("shell:am start -n 'com.dummy.component/.Main'").toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('Success\n');
      return conn.socket.causeEnd();
    });
    options = {
      component: 'com.dummy.component/.Main'
    };
    return cmd.execute(options).then(function() {
      return done();
    });
  });
  it("should send 'am start -W -D --user 0 -n <pkg>'", function(done) {
    var cmd, conn, options;
    conn = new MockConnection;
    cmd = new StartActivityCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData("shell:am start -n 'com.dummy.component/.Main' -D -W --user 0").toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('Success\n');
      return conn.socket.causeEnd();
    });
    options = {
      component: 'com.dummy.component/.Main',
      user: 0,
      wait: true,
      debug: true
    };
    return cmd.execute(options).then(function() {
      return done();
    });
  });
  it("should send 'am start -a <action>'", function(done) {
    var cmd, conn, options;
    conn = new MockConnection;
    cmd = new StartActivityCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData("shell:am start -a 'foo.ACTION_BAR'").toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('Success\n');
      return conn.socket.causeEnd();
    });
    options = {
      action: "foo.ACTION_BAR"
    };
    return cmd.execute(options).then(function() {
      return done();
    });
  });
  it("should send 'am start -d <data>'", function(done) {
    var cmd, conn, options;
    conn = new MockConnection;
    cmd = new StartActivityCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData("shell:am start -d 'foo://bar'").toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('Success\n');
      return conn.socket.causeEnd();
    });
    options = {
      data: "foo://bar"
    };
    return cmd.execute(options).then(function() {
      return done();
    });
  });
  it("should send 'am start -t <mimeType>'", function(done) {
    var cmd, conn, options;
    conn = new MockConnection;
    cmd = new StartActivityCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData("shell:am start -t 'text/plain'").toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('Success\n');
      return conn.socket.causeEnd();
    });
    options = {
      mimeType: "text/plain"
    };
    return cmd.execute(options).then(function() {
      return done();
    });
  });
  it("should send 'am start -c <category>'", function(done) {
    var cmd, conn, options;
    conn = new MockConnection;
    cmd = new StartActivityCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData("shell:am start -c 'android.intent.category.LAUNCHER'").toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('Success\n');
      return conn.socket.causeEnd();
    });
    options = {
      category: "android.intent.category.LAUNCHER"
    };
    return cmd.execute(options).then(function() {
      return done();
    });
  });
  it("should send 'am start -c <category1> -c <category2>'", function(done) {
    var cmd, conn, options;
    conn = new MockConnection;
    cmd = new StartActivityCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData("shell:am start -c 'android.intent.category.LAUNCHER' -c 'android.intent.category.DEFAULT'").toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('Success\n');
      return conn.socket.causeEnd();
    });
    options = {
      category: ["android.intent.category.LAUNCHER", "android.intent.category.DEFAULT"]
    };
    return cmd.execute(options).then(function() {
      return done();
    });
  });
  it("should send 'am start -f <flags>'", function(done) {
    var cmd, conn, options;
    conn = new MockConnection;
    cmd = new StartActivityCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData("shell:am start -f " + 0x10210000).toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('Success\n');
      return conn.socket.causeEnd();
    });
    options = {
      flags: 0x10210000
    };
    return cmd.execute(options).then(function() {
      return done();
    });
  });
  it("should send 'am start -n <pgk> --es <extras>'", function(done) {
    var cmd, conn, options;
    conn = new MockConnection;
    cmd = new StartActivityCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData("shell:am start --es 'key1' 'value1' --es 'key2' 'value2' -n 'com.dummy.component/.Main'").toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('Success\n');
      return conn.socket.causeEnd();
    });
    options = {
      component: "com.dummy.component/.Main",
      extras: [
        {
          key: 'key1',
          value: 'value1'
        }, {
          key: 'key2',
          value: 'value2'
        }
      ]
    };
    return cmd.execute(options).then(function() {
      return done();
    });
  });
  it("should send 'am start -n <pgk> --ei <extras>'", function(done) {
    var cmd, conn, options;
    conn = new MockConnection;
    cmd = new StartActivityCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData("shell:am start --ei 'key1' 1 --ei 'key2' 2 -n 'com.dummy.component/.Main'").toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('Success\n');
      return conn.socket.causeEnd();
    });
    options = {
      component: 'com.dummy.component/.Main',
      extras: [
        {
          key: 'key1',
          value: 1,
          type: 'int'
        }, {
          key: 'key2',
          value: 2,
          type: 'int'
        }
      ]
    };
    return cmd.execute(options).then(function() {
      return done();
    });
  });
  it("should send 'am start -n <pgk> --ez <extras>'", function(done) {
    var cmd, conn, options;
    conn = new MockConnection;
    cmd = new StartActivityCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData("shell:am start --ez 'key1' 'true' --ez 'key2' 'false' -n 'com.dummy.component/.Main'").toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('Success');
      return conn.socket.causeEnd();
    });
    options = {
      component: "com.dummy.component/.Main",
      extras: [
        {
          key: 'key1',
          value: true,
          type: 'bool'
        }, {
          key: 'key2',
          value: false,
          type: 'bool'
        }
      ]
    };
    return cmd.execute(options).then(function() {
      return done();
    });
  });
  it("should send 'am start -n <pgk> --el <extras>'", function(done) {
    var cmd, conn, options;
    conn = new MockConnection;
    cmd = new StartActivityCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData("shell:am start --el 'key1' 1 --el 'key2' '2' -n 'com.dummy.component/.Main'").toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('Success');
      return conn.socket.causeEnd();
    });
    options = {
      component: 'com.dummy.component/.Main',
      extras: [
        {
          key: 'key1',
          value: 1,
          type: 'long'
        }, {
          key: 'key2',
          value: '2',
          type: 'long'
        }
      ]
    };
    return cmd.execute(options).then(function() {
      return done();
    });
  });
  it("should send 'am start -n <pgk> --eu <extras>'", function(done) {
    var cmd, conn, options;
    conn = new MockConnection;
    cmd = new StartActivityCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData("shell:am start --eu 'key1' 'http://example.org' --eu 'key2' 'http://example.org' -n 'com.dummy.component/.Main'").toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('Success');
      return conn.socket.causeEnd();
    });
    options = {
      component: 'com.dummy.component/.Main',
      extras: [
        {
          key: 'key1',
          value: 'http://example.org',
          type: 'uri'
        }, {
          key: 'key2',
          value: 'http://example.org',
          type: 'uri'
        }
      ]
    };
    return cmd.execute(options).then(function() {
      return done();
    });
  });
  it("should send 'am start -n <pgk> --es <extras>'", function(done) {
    var cmd, conn, options;
    conn = new MockConnection;
    cmd = new StartActivityCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData("shell:am start --es 'key1' 'a' --es 'key2' 'b' -n 'com.dummy.component/.Main'").toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('Success');
      return conn.socket.causeEnd();
    });
    options = {
      component: 'com.dummy.component/.Main',
      extras: [
        {
          key: 'key1',
          value: 'a',
          type: 'string'
        }, {
          key: 'key2',
          value: 'b',
          type: 'string'
        }
      ]
    };
    return cmd.execute(options).then(function() {
      return done();
    });
  });
  it("should send 'am start -n <pgk> --eia <extras with arr>'", function(done) {
    var cmd, conn, options;
    conn = new MockConnection;
    cmd = new StartActivityCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData("shell:am start --eia 'key1' '2,3' --ela 'key2' '20,30' --ei 'key3' 5 -n 'com.dummy.component/.Main'").toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('Success');
      return conn.socket.causeEnd();
    });
    options = {
      component: 'com.dummy.component/.Main',
      extras: [
        {
          key: 'key1',
          value: [2, 3],
          type: 'int'
        }, {
          key: 'key2',
          value: [20, 30],
          type: 'long'
        }, {
          key: 'key3',
          value: 5,
          type: 'int'
        }
      ]
    };
    return cmd.execute(options).then(function() {
      return done();
    });
  });
  it("should send 'am start -n <pgk> --esn <extras>'", function(done) {
    var cmd, conn, options;
    conn = new MockConnection;
    cmd = new StartActivityCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData("shell:am start --esn 'key1' --esn 'key2' -n 'com.dummy.component/.Main'").toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('Success');
      return conn.socket.causeEnd();
    });
    options = {
      component: 'com.dummy.component/.Main',
      extras: [
        {
          key: 'key1',
          type: 'null'
        }, {
          key: 'key2',
          type: 'null'
        }
      ]
    };
    return cmd.execute(options).then(function() {
      return done();
    });
  });
  it("should throw when calling with an unknown extra type", function(done) {
    var cmd, conn, options;
    conn = new MockConnection;
    cmd = new StartActivityCommand(conn);
    options = {
      component: 'com.dummy.component/.Main',
      extras: [
        {
          key: 'key1',
          value: 'value1',
          type: 'nonexisting'
        }
      ]
    };
    expect(function() {
      return cmd.execute(options, function() {});
    }).to["throw"];
    return done();
  });
  it("should accept mixed types of extras", function(done) {
    var cmd, conn, options;
    conn = new MockConnection;
    cmd = new StartActivityCommand(conn);
    conn.socket.on('write', function(chunk) {
      return expect(chunk.toString()).to.equal(Protocol.encodeData("shell:am start --ez 'key1' 'true' --es 'key2' 'somestr' --es 'key3' 'defaultType' --ei 'key4' 3 --el 'key5' '4' --eu 'key6' 'http://example.org' --esn 'key7' -n 'com.dummy.component/.Main'").toString());
    });
    setImmediate(function() {
      conn.socket.causeRead(Protocol.OKAY);
      conn.socket.causeRead('Success');
      return conn.socket.causeEnd();
    });
    options = {
      component: 'com.dummy.component/.Main',
      extras: [
        {
          key: 'key1',
          value: true,
          type: 'bool'
        }, {
          key: 'key2',
          value: 'somestr',
          type: 'string'
        }, {
          key: 'key3',
          value: 'defaultType'
        }, {
          key: 'key4',
          value: 3,
          type: 'int'
        }, {
          key: 'key5',
          value: '4',
          type: 'long'
        }, {
          key: 'key6',
          value: 'http://example.org',
          type: 'uri'
        }, {
          key: 'key7',
          type: 'null'
        }
      ]
    };
    return cmd.execute(options).then(function() {
      return done();
    });
  });
  return it("should map short extras to long extras", function(done) {
    var cmd, conn, long, short;
    conn = new MockConnection;
    cmd = new StartActivityCommand(conn);
    short = cmd._formatExtras({
      someString: 'bar',
      someInt: 5,
      someUrl: {
        type: 'uri',
        value: 'http://example.org'
      },
      someArray: {
        type: 'int',
        value: [1, 2]
      },
      someNull: null
    });
    long = cmd._formatExtras([
      {
        key: 'someString',
        value: 'bar',
        type: 'string'
      }, {
        key: 'someInt',
        value: 5,
        type: 'int'
      }, {
        key: 'someUrl',
        value: 'http://example.org',
        type: 'uri'
      }, {
        key: 'someArray',
        value: [1, 2],
        type: 'int'
      }, {
        key: 'someNull',
        type: 'null'
      }
    ]);
    expect(short).to.eql(long);
    return done();
  });
});
