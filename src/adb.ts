import Client, { ClientOptions } from './adb/client';
import Keycode from './adb/keycode';
import * as util from './adb/util';

export default class Adb {
    static createClient(options: Partial<ClientOptions> = {}) {
        if (!options.host) {
            options.host = process.env.ADB_HOST;
        }
        if (!options.port && process.env.ADB_PORT) {
            options.port = parseInt(process.env.ADB_PORT, 10);
        }
        return new Client(options);
    }
}

export { Keycode, util };
