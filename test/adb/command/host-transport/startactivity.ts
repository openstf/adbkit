import MockConnection from '../../../mock/connection';
import Protocol from '../../../../src/adb/protocol';
import StartActivityCommand from '../../../../src/adb/command/host-transport/startactivity';

describe('StartActivityCommand', () => {
    it("should succeed when 'Success' returned", async () => {
        const conn = new MockConnection();
        const cmd = new StartActivityCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Success');
            conn.socket.causeEnd();
        });
        const options = { component: 'com.dummy.component/.Main' };
        await cmd.execute(options);
    });

    it("should fail when 'Error' returned", async done => {
        const conn = new MockConnection();
        const cmd = new StartActivityCommand(conn);
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Error: foo\n');
            conn.socket.causeEnd();
        });
        const options = { component: 'com.dummy.component/.Main' };
        try {
            await cmd.execute(options);
        } catch (err) {
            expect(err).toBeInstanceOf(Error);
            done();
        }
    });

    it("should send 'am start -n <pkg>'", async () => {
        const conn = new MockConnection();
        const cmd = new StartActivityCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData(
                    "shell:am start -n 'com.dummy.component/.Main'",
                ).toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Success\n');
            conn.socket.causeEnd();
        });
        const options = { component: 'com.dummy.component/.Main' };
        await cmd.execute(options);
    });

    it("should send 'am start -W -D --user 0 -n <pkg>'", async () => {
        const conn = new MockConnection();
        const cmd = new StartActivityCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData(
                    "shell:am start \
-n 'com.dummy.component/.Main' \
-D \
-W \
--user 0",
                ).toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Success\n');
            conn.socket.causeEnd();
        });
        const options = {
            component: 'com.dummy.component/.Main',
            user: 0,
            wait: true,
            debug: true,
        };
        await cmd.execute(options);
    });

    it("should send 'am start -a <action>'", async () => {
        const conn = new MockConnection();
        const cmd = new StartActivityCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData(
                    "shell:am start -a 'foo.ACTION_BAR'",
                ).toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Success\n');
            conn.socket.causeEnd();
        });
        const options = { action: 'foo.ACTION_BAR' };
        await cmd.execute(options);
    });

    it("should send 'am start -d <data>'", async () => {
        const conn = new MockConnection();
        const cmd = new StartActivityCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData("shell:am start -d 'foo://bar'").toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Success\n');
            conn.socket.causeEnd();
        });
        const options = { data: 'foo://bar' };
        await cmd.execute(options);
    });

    it("should send 'am start -t <mimeType>'", async () => {
        const conn = new MockConnection();
        const cmd = new StartActivityCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData(
                    "shell:am start -t 'text/plain'",
                ).toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Success\n');
            conn.socket.causeEnd();
        });
        const options = { mimeType: 'text/plain' };
        await cmd.execute(options);
    });

    it("should send 'am start -c <category>'", async () => {
        const conn = new MockConnection();
        const cmd = new StartActivityCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData(
                    "shell:am start -c 'android.intent.category.LAUNCHER'",
                ).toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Success\n');
            conn.socket.causeEnd();
        });
        const options = { category: 'android.intent.category.LAUNCHER' };
        await cmd.execute(options);
    });

    it("should send 'am start -c <category1> -c <category2>'", async () => {
        const conn = new MockConnection();
        const cmd = new StartActivityCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData(
                    "shell:am start \
-c 'android.intent.category.LAUNCHER' \
-c 'android.intent.category.DEFAULT'",
                ).toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Success\n');
            conn.socket.causeEnd();
        });
        const options = {
            category: [
                'android.intent.category.LAUNCHER',
                'android.intent.category.DEFAULT',
            ],
        };
        await cmd.execute(options);
    });

    it("should send 'am start -f <flags>'", async () => {
        const conn = new MockConnection();
        const cmd = new StartActivityCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData(
                    `shell:am start -f ${0x10210000}`,
                ).toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Success\n');
            conn.socket.causeEnd();
        });
        const options = { flags: 0x10210000 };
        await cmd.execute(options);
    });

    it("should send 'am start -n <pgk> --es <extras>'", async () => {
        const conn = new MockConnection();
        const cmd = new StartActivityCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData(
                    "shell:am start \
--es 'key1' 'value1' \
--es 'key2' 'value2' \
-n 'com.dummy.component/.Main'",
                ).toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Success\n');
            conn.socket.causeEnd();
        });
        const options = {
            component: 'com.dummy.component/.Main',
            extras: [
                {
                    key: 'key1',
                    value: 'value1',
                },
                {
                    key: 'key2',
                    value: 'value2',
                },
            ],
        };
        await cmd.execute(options);
    });

    it("should send 'am start -n <pgk> --ei <extras>'", async () => {
        const conn = new MockConnection();
        const cmd = new StartActivityCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData(
                    "shell:am start \
--ei 'key1' 1 \
--ei 'key2' 2 \
-n 'com.dummy.component/.Main'",
                ).toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Success\n');
            conn.socket.causeEnd();
        });
        const options = {
            component: 'com.dummy.component/.Main',
            extras: [
                {
                    key: 'key1',
                    value: 1,
                    type: 'int',
                },
                {
                    key: 'key2',
                    value: 2,
                    type: 'int',
                },
            ],
        };
        await cmd.execute(options);
    });

    it("should send 'am start -n <pgk> --ez <extras>'", async () => {
        const conn = new MockConnection();
        const cmd = new StartActivityCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData(
                    "shell:am start \
--ez 'key1' 'true' \
--ez 'key2' 'false' \
-n 'com.dummy.component/.Main'",
                ).toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Success');
            conn.socket.causeEnd();
        });
        const options = {
            component: 'com.dummy.component/.Main',
            extras: [
                {
                    key: 'key1',
                    value: true,
                    type: 'bool',
                },
                {
                    key: 'key2',
                    value: false,
                    type: 'bool',
                },
            ],
        };
        await cmd.execute(options);
    });

    it("should send 'am start -n <pgk> --el <extras>'", async () => {
        const conn = new MockConnection();
        const cmd = new StartActivityCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData(
                    "shell:am start \
--el 'key1' 1 \
--el 'key2' '2' \
-n 'com.dummy.component/.Main'",
                ).toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Success');
            conn.socket.causeEnd();
        });
        const options = {
            component: 'com.dummy.component/.Main',
            extras: [
                {
                    key: 'key1',
                    value: 1,
                    type: 'long',
                },
                {
                    key: 'key2',
                    value: '2',
                    type: 'long',
                },
            ],
        };
        await cmd.execute(options);
    });

    it("should send 'am start -n <pgk> --eu <extras>'", async () => {
        const conn = new MockConnection();
        const cmd = new StartActivityCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData(
                    "shell:am start \
--eu 'key1' 'http://example.org' \
--eu 'key2' 'http://example.org' \
-n 'com.dummy.component/.Main'",
                ).toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Success');
            conn.socket.causeEnd();
        });
        const options = {
            component: 'com.dummy.component/.Main',
            extras: [
                {
                    key: 'key1',
                    value: 'http://example.org',
                    type: 'uri',
                },
                {
                    key: 'key2',
                    value: 'http://example.org',
                    type: 'uri',
                },
            ],
        };
        await cmd.execute(options);
    });

    it("should send 'am start -n <pgk> --es <extras>'", async () => {
        const conn = new MockConnection();
        const cmd = new StartActivityCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData(
                    "shell:am start \
--es 'key1' 'a' \
--es 'key2' 'b' \
-n 'com.dummy.component/.Main'",
                ).toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Success');
            conn.socket.causeEnd();
        });
        const options = {
            component: 'com.dummy.component/.Main',
            extras: [
                {
                    key: 'key1',
                    value: 'a',
                    type: 'string',
                },
                {
                    key: 'key2',
                    value: 'b',
                    type: 'string',
                },
            ],
        };
        await cmd.execute(options);
    });

    it("should send 'am start -n <pgk> --eia <extras with arr>'", async () => {
        const conn = new MockConnection();
        const cmd = new StartActivityCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData(
                    "shell:am start \
--eia 'key1' '2,3' \
--ela 'key2' '20,30' \
--ei 'key3' 5 \
-n 'com.dummy.component/.Main'",
                ).toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Success');
            conn.socket.causeEnd();
        });
        const options = {
            component: 'com.dummy.component/.Main',
            extras: [
                {
                    key: 'key1',
                    value: [2, 3],
                    type: 'int',
                },
                {
                    key: 'key2',
                    value: [20, 30],
                    type: 'long',
                },
                {
                    key: 'key3',
                    value: 5,
                    type: 'int',
                },
            ],
        };
        await cmd.execute(options);
    });

    it("should send 'am start -n <pgk> --esn <extras>'", async () => {
        const conn = new MockConnection();
        const cmd = new StartActivityCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData(
                    "shell:am start \
--esn 'key1' \
--esn 'key2' \
-n 'com.dummy.component/.Main'",
                ).toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Success');
            conn.socket.causeEnd();
        });
        const options = {
            component: 'com.dummy.component/.Main',
            extras: [
                {
                    key: 'key1',
                    type: 'null' as 'null',
                },
                {
                    key: 'key2',
                    type: 'null' as 'null',
                },
            ],
        };
        await cmd.execute(options);
    });

    it('should throw when calling with an unknown extra type', () => {
        const conn = new MockConnection();
        const cmd = new StartActivityCommand(conn);
        const options = {
            component: 'com.dummy.component/.Main',
            extras: [
                {
                    key: 'key1',
                    value: 'value1',
                    type: 'nonexisting',
                },
            ],
        };
        expect(cmd.execute(options)).rejects.toThrow();
    });

    it('should accept mixed types of extras', async () => {
        const conn = new MockConnection();
        const cmd = new StartActivityCommand(conn);
        conn.socket.on('write', chunk =>
            expect(chunk.toString()).toBe(
                Protocol.encodeData(
                    "shell:am start \
--ez 'key1' 'true' \
--es 'key2' 'somestr' \
--es 'key3' 'defaultType' \
--ei 'key4' 3 \
--el 'key5' '4' \
--eu 'key6' 'http://example.org' \
--esn 'key7' \
-n 'com.dummy.component/.Main'",
                ).toString(),
            ),
        );
        setImmediate(() => {
            conn.socket.causeRead(Protocol.OKAY);
            conn.socket.causeRead('Success');
            conn.socket.causeEnd();
        });
        const options = {
            component: 'com.dummy.component/.Main',
            extras: [
                {
                    key: 'key1',
                    value: true,
                    type: 'bool',
                },
                {
                    key: 'key2',
                    value: 'somestr',
                    type: 'string',
                },
                {
                    key: 'key3',
                    value: 'defaultType',
                },
                {
                    key: 'key4',
                    value: 3,
                    type: 'int',
                },
                {
                    key: 'key5',
                    value: '4',
                    type: 'long',
                },
                {
                    key: 'key6',
                    value: 'http://example.org',
                    type: 'uri',
                },
                {
                    key: 'key7',
                    type: 'null' as 'null',
                },
            ],
        };
        await cmd.execute(options);
    });

    it('should map short extras to long extras', () => {
        const conn = new MockConnection();
        const cmd = new StartActivityCommand(conn);
        const short = cmd._formatExtras({
            someString: 'bar',
            someInt: 5,
            someUrl: {
                type: 'uri',
                value: 'http://example.org',
            },
            someArray: {
                type: 'int',
                value: [1, 2],
            },
            someNull: null,
        });
        const long = cmd._formatExtras([
            {
                key: 'someString',
                value: 'bar',
                type: 'string',
            },
            {
                key: 'someInt',
                value: 5,
                type: 'int',
            },
            {
                key: 'someUrl',
                value: 'http://example.org',
                type: 'uri',
            },
            {
                key: 'someArray',
                value: [1, 2],
                type: 'int',
            },
            {
                key: 'someNull',
                type: 'null',
            },
        ]);
        expect(short).toEqual(long);
    });
});
