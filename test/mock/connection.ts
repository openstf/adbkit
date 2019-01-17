import Parser from '../../src/adb/parser';
import MockDuplex from './duplex';
import { IConnection } from '../../src/adb/connection';

export default class MockConnection implements IConnection {
    socket = new MockDuplex();
    parser = new Parser(this.socket);

    end() {
        this.socket.causeEnd();
        return this;
    }

    write(data: Buffer, callback?: () => void) {
        this.socket.write(data, callback);
        return this;
    }
}
