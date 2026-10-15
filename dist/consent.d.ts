export type ConsentState = "pending" | "granted" | "denied";
export declare class ConsentManager {
    private state;
    constructor(state?: ConsentState);
    get(): ConsentState;
    set(state: ConsentState): void;
    canCollect(): boolean;
}
//# sourceMappingURL=consent.d.ts.map