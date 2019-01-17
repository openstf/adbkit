// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
import { EventEmitter } from 'events';

import { PrematureEOFError } from './parser';
import Command from './command';

export class CancellationError extends Error {
    constructor() {
        super(); // TODO check sanity
        Error.call(this);
        this.name = 'CancellationError';
        Error.captureStackTrace(this, CancellationError);
    }
}

export interface Device {
    id: string;
    type: string;
}

export interface DevicesCommand extends Command {
    _readDevices(): Promise<Device[]>;
}

export default class Tracker extends EventEmitter {
    deviceList: Device[] = [];
    deviceMap = new Map<Device['id'], Device>();

    reader: Promise<any>;

    controller: AbortController;

    constructor(public command: DevicesCommand) {
        super();
        this.controller = new AbortController();
        this.reader = (async () => {
            try {
                return await this.read();
            } catch (err) {
                if (err instanceof CancellationError) {
                    return true;
                } else if (err instanceof PrematureEOFError) {
                    throw new Error('Connection closed');
                } else {
                    this.emit('error', err);
                }
            } finally {
                await this.command.parser!.end();
                this.emit('end');
            }
        })();
    }

    async read(): Promise<void> {
        if (this.controller.signal.aborted) throw new CancellationError();
        const list = await this.command._readDevices();
        if (this.controller.signal.aborted) throw new CancellationError();
        this.update(list);
        return this.read();
    }

    update(newList: Device[]) {
        const changeSet = {
            removed: [] as Device[],
            changed: [] as Device[],
            added: [] as Device[],
        };
        const newMap = new Map<Device['id'], Device>();
        for (const device of newList) {
            const oldDevice = this.deviceMap.get(device.id);
            if (oldDevice) {
                if (oldDevice.type !== device.type) {
                    changeSet.changed.push(device);
                    this.emit('change', device, oldDevice);
                }
            } else {
                changeSet.added.push(device);
                this.emit('add', device);
            }
            newMap.set(device.id, device);
        }
        for (const device of this.deviceList) {
            if (!newMap.has(device.id)) {
                changeSet.removed.push(device);
                this.emit('remove', device);
            }
        }
        this.emit('changeSet', changeSet);
        this.deviceList = newList;
        this.deviceMap = newMap;
        return this;
    }

    end() {
        this.controller.abort();
        return this;
    }
}
