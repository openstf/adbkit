import { PassThrough } from 'stream';

import Parser from '../../src/adb/parser';
import Tracker from '../../src/adb/tracker';
import Protocol from '../../src/adb/protocol';
import HostTrackDevicesCommand from '../../src/adb/command/host/trackdevices';
import Connection from '../../src/adb/connection';

describe('Tracker', () => {
    let writer: PassThrough;
    let conn: {
        parser: Parser;
        end: Function;
    };
    let cmd: HostTrackDevicesCommand;
    let tracker: Tracker;
    beforeEach(() => {
        writer = new PassThrough();
        conn = {
            parser: new Parser(writer),
            end() {},
        };
        cmd = new HostTrackDevicesCommand(conn as Connection);
        tracker = new Tracker(cmd);
    });

    it("should emit 'add' when a device is added", () => {
        const spy = jest.fn();
        tracker.on('add', spy);
        const device1 = {
            id: 'a',
            type: 'device',
        };
        const device2 = {
            id: 'b',
            type: 'device',
        };
        tracker.update([device1, device2]);
        expect(spy).toBeCalledTimes(2);
        expect(spy).toBeCalledWith(device1);
        expect(spy).toBeCalledWith(device2);
    });

    it("should emit 'remove' when a device is removed", () => {
        const spy = jest.fn();
        tracker.on('remove', spy);
        const device1 = {
            id: 'a',
            type: 'device',
        };
        const device2 = {
            id: 'b',
            type: 'device',
        };
        tracker.update([device1, device2]);
        tracker.update([device1]);
        expect(spy).toBeCalledTimes(1);
        expect(spy).toBeCalledWith(device2);
    });

    it("should emit 'change' when a device changes", () => {
        const spy = jest.fn();
        tracker.on('change', spy);
        const deviceOld = {
            id: 'a',
            type: 'device',
        };
        const deviceNew = {
            id: 'a',
            type: 'offline',
        };
        tracker.update([deviceOld]);
        tracker.update([deviceNew]);
        expect(spy).toBeCalledTimes(1);
        expect(spy).toBeCalledWith(deviceNew, deviceOld);
    });

    it("should emit 'changeSet' with all changes", () => {
        const spy = jest.fn();
        tracker.on('changeSet', spy);
        const device1 = {
            id: 'a',
            type: 'device',
        };
        const device2 = {
            id: 'b',
            type: 'device',
        };
        const device3 = {
            id: 'c',
            type: 'device',
        };
        const device3New = {
            id: 'c',
            type: 'offline',
        };
        const device4 = {
            id: 'd',
            type: 'offline',
        };
        tracker.update([device1, device2, device3]);
        tracker.update([device1, device3New, device4]);
        expect(spy).toBeCalledTimes(2);
        expect(spy).toBeCalledWith({
            added: [device1, device2, device3],
            changed: [],
            removed: [],
        });
        expect(spy).toBeCalledWith({
            added: [device4],
            changed: [device3New],
            removed: [device2],
        });
    });

    it("should emit 'error' and 'end' when connection ends", done => {
        tracker.on('error', () => {
            return tracker.on('end', () => done());
        });
        writer.end();
    });

    it('should read devices from socket', () => {
        const spy = jest.fn();
        tracker.on('changeSet', spy);
        const device1 = {
            id: 'a',
            type: 'device',
        };
        const device2 = {
            id: 'b',
            type: 'device',
        };
        const device3 = {
            id: 'c',
            type: 'device',
        };
        const device3New = {
            id: 'c',
            type: 'offline',
        };
        const device4 = {
            id: 'd',
            type: 'offline',
        };
        writer.write(
            Protocol.encodeData(`\
a\tdevice
b\tdevice
c\tdevice\
`),
        );
        writer.write(
            Protocol.encodeData(`\
a\tdevice
c\toffline
d\toffline\
`),
        );
        setImmediate(function() {
            expect(spy).toBeCalledTimes(2);
            expect(spy).toBeCalledWith({
                added: [device1, device2, device3],
                changed: [],
                removed: [],
            });
            expect(spy).toBeCalledWith({
                added: [device4],
                changed: [device3New],
                removed: [device2],
            });
        });
    });

    return describe('end()', () => {
        it('should close the connection', done => {
            conn.parser.end = jest.fn();
            tracker.on('end', () => {
                expect(conn.parser.end).toBeCalledTimes(1);
                done();
            });
            return tracker.end();
        });

        it('should not cause an error to be emit', done => {
            const spy = jest.fn();
            tracker.on('error', spy);
            tracker.on('end', () => {
                expect(spy).not.toBeCalled();
                done();
            });
            return tracker.end();
        });
    });
});
