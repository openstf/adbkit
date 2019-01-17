export default class RollingCounter {
    now: number;
    constructor(public max: number, public min = 1) {
        this.now = this.min;
    }

    next() {
        if (!(this.now < this.max)) {
            this.now = this.min;
        }
        return ++this.now;
    }
}
