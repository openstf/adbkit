import Tracker from '../../tracker';
import { HostDevicesCommandBase } from './devices';

export default class HostTrackDevicesCommand extends HostDevicesCommandBase {
    async execute(): Promise<Tracker> {
        this._send('host:track-devices');
        return this._readReply(() => new Tracker(this));
    }
}
