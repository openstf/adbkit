import Stats from './stats';

export default class Entry extends Stats {
    constructor(
        public name: string,
        mode: number,
        size: number,
        mtime: number,
    ) {
        super(mode, size, mtime);
    }

    toString() {
        return this.name;
    }
}
