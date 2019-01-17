import Adb from '../src/adb';
import Client from '../src/adb/client';

describe('@createClient(options)', () =>
    it('should return a Client instance', () => {
        expect(Adb.createClient()).toBeInstanceOf(Client);
    }));
