export class ConsentManager {
    state;
    constructor(state = "granted") {
        this.state = state;
    }
    get() {
        return this.state;
    }
    set(state) {
        this.state = state;
    }
    canCollect() {
        return this.state === "granted";
    }
}
//# sourceMappingURL=consent.js.map