import { Stats as FsStats } from 'fs';
import { PassThrough } from 'stream';
import { strict as assert } from 'assert';

import Adb from '../../src/adb';
import Sync from '../../src/adb/sync';
import Stats from '../../src/adb/sync/stats';
import Entry from '../../src/adb/sync/entry';
import PushTransfer from '../../src/adb/sync/pushtransfer';
import PullTransfer from '../../src/adb/sync/pulltransfer';
import MockConnection from '../mock/connection';
import Client from '../../src/adb/client';
import { Device } from '../../src/adb/tracker';

// This test suite is a bit special in that it requires a connected Android
// device (or many devices). All will be tested.
describe('Sync', () => {
    // By default, skip tests that require a device.
    const deviceTest = process.env.RUN_DEVICE_TESTS ? it : xit;

    const SURELY_EXISTING_FILE = '/system/build.prop';
    const SURELY_EXISTING_PATH = '/';
    const SURELY_NONEXISTING_PATH = '/non-existing-path';
    const SURELY_WRITABLE_FILE = '/data/local/tmp/_sync.test';

    let client: Client;
    let deviceList: Device[];

    async function forEachSyncDevice(iterator: (sync: Sync) => any) {
        assert(
            deviceList.length > 0,
            'At least one connected Android device is required',
        );

        await Promise.all(
            deviceList.map(async device => {
                const sync = await client.syncService(device.id);
                expect(sync).toBeInstanceOf(Sync);
                try {
                    await iterator(sync);
                } finally {
                    sync.end();
                }
            }),
        );
    }

    beforeAll(async () => {
        client = Adb.createClient();
        deviceList = await client.listDevices();
    });

    describe('end()', () =>
        it('should end the sync connection', () => {
            const conn = new MockConnection();
            const sync = new Sync(conn as any);
            conn.end = jest.fn();
            sync.end();
            expect(conn.end).toHaveBeenCalled();
        }));

    describe('push(contents, path[, mode])', () => {
        it('should call pushStream when contents is a Stream', () => {
            const conn = new MockConnection();
            const sync = new Sync(conn as any);
            const stream = new PassThrough();
            sync.pushStream = jest.fn();
            sync.push(stream, 'foo');
            expect(sync.pushStream).toHaveBeenCalled();
        });

        it('should call pushFile when contents is a String', () => {
            const conn = new MockConnection();
            const sync = new Sync(conn as any);
            const stream = new PassThrough();
            sync.pushFile = jest.fn();
            sync.push(__filename, 'foo');
            expect(sync.pushFile).toHaveBeenCalled();
        });

        it('should return a PushTransfer instance', async () => {
            const conn = new MockConnection();
            const sync = new Sync(conn as any);
            const stream = new PassThrough();
            const transfer = await sync.push(stream, 'foo');
            expect(transfer).toBeInstanceOf(PushTransfer);
        });
    });

    describe('pushStream(stream, path[, mode])', () => {
        it('should return a PushTransfer instance', () => {
            const conn = new MockConnection();
            const sync = new Sync(conn as any);
            const stream = new PassThrough();
            const transfer = sync.pushStream(stream, 'foo');
            expect(transfer).toBeInstanceOf(PushTransfer);
        });

        deviceTest(
            'should be able to push >65536 byte chunks without error',
            async () =>
                forEachSyncDevice(async sync => {
                    const stream = new PassThrough();
                    const content = new Buffer(1000000);
                    const transfer = await sync.pushStream(
                        stream,
                        SURELY_WRITABLE_FILE,
                    );
                    return new Promise((resolve, reject) => {
                        transfer.on('error', reject);
                        transfer.on('end', resolve);
                        stream.write(content);
                        stream.end();
                    });
                }),
        );
    });

    describe('pull(path)', () => {
        deviceTest(
            'should retrieve the same content pushStream() pushed',
            async () =>
                forEachSyncDevice(async sync => {
                    const stream = new PassThrough();
                    const content = `ABCDEFGHI${Date.now()}`;
                    let transfer = await sync.pushStream(
                        stream,
                        SURELY_WRITABLE_FILE,
                    );
                    expect(transfer).toBeInstanceOf(PushTransfer);
                    return new Promise(function(resolve, reject) {
                        transfer.on('error', reject);
                        transfer.on('end', () => {
                            let transfer = sync.pull(SURELY_WRITABLE_FILE);
                            expect(transfer).toBeInstanceOf(PullTransfer);
                            transfer.on('error', reject);
                            transfer.on('readable', () => {
                                let chunk;
                                while ((chunk = transfer.read())) {
                                    expect(chunk).not.toBeNull();
                                    expect(chunk.toString()).toBe(content);
                                    resolve();
                                }
                            });
                        });
                        stream.write(content);
                        return stream.end();
                    });
                }),
        );

        deviceTest('should emit error for non-existing files', async () =>
            forEachSyncDevice(
                sync =>
                    new Promise(function(resolve, reject) {
                        const transfer = sync.pull(SURELY_NONEXISTING_PATH);
                        return transfer.on('error', resolve);
                    }),
            ),
        );

        deviceTest('should return a PullTransfer instance', async () =>
            forEachSyncDevice(sync => {
                const rval = sync.pull(SURELY_EXISTING_FILE);
                expect(rval).toBeInstanceOf(PullTransfer);
                return rval.cancel();
            }),
        );

        describe('Stream', () =>
            deviceTest("should emit 'end' when pull is done", async () =>
                forEachSyncDevice(
                    sync =>
                        new Promise(function(resolve, reject) {
                            const transfer = sync.pull(SURELY_EXISTING_FILE);
                            transfer.on('error', reject);
                            transfer.on('end', resolve);
                            return transfer.resume();
                        }),
                ),
            ));
    });

    describe('stat(path)', () => {
        deviceTest('should return a Promise', async () =>
            forEachSyncDevice(sync => {
                const rval = sync.stat(SURELY_EXISTING_PATH);
                expect(rval).toBeInstanceOf(Promise);
                return rval;
            }),
        );

        deviceTest(
            'should call with an ENOENT error if the path does not exist',
            async () =>
                forEachSyncDevice(async sync => {
                    try {
                        await sync.stat(SURELY_NONEXISTING_PATH);
                        throw new Error('Should not reach success branch');
                    } catch (err) {
                        expect(err).toBeInstanceOf(Error);
                        expect(err.code).toBe('ENOENT');
                        expect(err.errno).toBe(34);
                        expect(err.path).toBe(SURELY_NONEXISTING_PATH);
                    }
                }),
        );

        deviceTest(
            'should call with an fs.Stats instance for an existing path',
            async () =>
                forEachSyncDevice(async sync => {
                    const stats = await sync.stat(SURELY_EXISTING_PATH);
                    return expect(stats).toBeInstanceOf(FsStats);
                }),
        );

        describe('Stats', () => {
            it('should implement fs.Stats', () => {
                expect(new Stats(0, 0, 0)).toBeInstanceOf(FsStats);
            });

            deviceTest(
                'should set the `.mode` property for isFile() etc',
                async () =>
                    forEachSyncDevice(async sync => {
                        const stats = await sync.stat(SURELY_EXISTING_FILE);
                        expect(stats).toBeInstanceOf(FsStats);
                        expect(stats.mode).toBeGreaterThan(0);
                        expect(stats.isFile()).toBe(true);
                        expect(stats.isDirectory()).toBe(false);
                    }),
            );

            deviceTest('should set the `.size` property', async () =>
                forEachSyncDevice(async sync => {
                    const stats = await sync.stat(SURELY_EXISTING_FILE);
                    expect(stats).toBeInstanceOf(FsStats);
                    expect(stats.isFile()).toBe(true);
                    expect(stats.size).toBeGreaterThan(0);
                }),
            );

            deviceTest('should set the `.mtime` property', async () =>
                forEachSyncDevice(async sync => {
                    const stats = await sync.stat(SURELY_EXISTING_FILE);
                    expect(stats).toBeInstanceOf(FsStats);
                    expect(stats.mtime).toBeInstanceOf(Date);
                }),
            );
        });

        describe('Entry', () => {
            it('should implement Stats', () => {
                expect(new Entry('foo', 0, 0, 0)).toBeInstanceOf(Stats);
            });

            deviceTest('should set the `.name` property', async () =>
                forEachSyncDevice(async sync => {
                    const files = await sync.readdir(SURELY_EXISTING_PATH);
                    expect(files).toBeInstanceOf(Array);
                    files.forEach(function(file) {
                        expect(file.name).not.toBeNull();
                        expect(file).toBeInstanceOf(Entry);
                    });
                }),
            );

            deviceTest('should set the Stats properties', async () =>
                forEachSyncDevice(async sync => {
                    const files = await sync.readdir(SURELY_EXISTING_PATH);
                    expect(files).toBeInstanceOf(Array);
                    files.forEach(file => {
                        expect(file.mode).not.toBeNull();
                        expect(file.size).not.toBeNull();
                        expect(file.mtime).not.toBeNull();
                    });
                }),
            );
        });
    });
});
