import { Writable } from 'stream';

export = Logcat;
declare class Logcat {
    static readStream(
        stream: Writable,
        options?: { format?: 'binary'; fixLineFeeds?: boolean },
    ): any;
}
declare namespace Logcat {
    class Priority {
        static DEBUG: number;
        static DEFAULT: number;
        static ERROR: number;
        static FATAL: number;
        static INFO: number;
        static SILENT: number;
        static UNKNOWN: number;
        static VERBOSE: number;
        static WARN: number;
        static fromLetter(letter: any): any;
        static fromName(name: any): any;
        static toLetter(value: any): any;
        static toName(value: any): any;
    }
    class Reader {
        static ANY: string;
        static defaultMaxListeners: any;
        static init(): void;
        static listenerCount(emitter: any, type: any): any;
        static usingDomains: boolean;
        constructor(options: any);
        options: any;
        filters: any;
        parser: any;
        stream: any;
        addListener(type: any, listener: any): any;
        connect(stream: any): any;
        emit(type: any, ...args: any[]): any;
        end(): any;
        eventNames(): any;
        exclude(tag: any): any;
        excludeAll(): any;
        getMaxListeners(): any;
        include(tag: any, priority: any): any;
        includeAll(priority: any): any;
        listenerCount(type: any): any;
        listeners(type: any): any;
        on(type: any, listener: any): any;
        once(type: any, listener: any): any;
        prependListener(type: any, listener: any): any;
        prependOnceListener(type: any, listener: any): any;
        removeAllListeners(type: any, ...args: any[]): any;
        removeListener(type: any, listener: any): any;
        resetFilters(): any;
        setMaxListeners(n: any): any;
    }
    namespace Reader {
        class EventEmitter {
            // Circular reference from index.Reader.EventEmitter
            static EventEmitter: any;
            static defaultMaxListeners: any;
            static init(): void;
            static listenerCount(emitter: any, type: any): any;
            static usingDomains: boolean;
            addListener(type: any, listener: any): any;
            emit(type: any, ...args: any[]): any;
            eventNames(): any;
            getMaxListeners(): any;
            listenerCount(type: any): any;
            listeners(type: any): any;
            on(type: any, listener: any): any;
            once(type: any, listener: any): any;
            prependListener(type: any, listener: any): any;
            prependOnceListener(type: any, listener: any): any;
            removeAllListeners(type: any, ...args: any[]): any;
            removeListener(type: any, listener: any): any;
            setMaxListeners(n: any): any;
        }
    }
}
