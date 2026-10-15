import type { KeyValueStorage } from "./contracts.js";
import type { EventIdentity } from "./types.js";
declare function createId(): string;
export declare class IdentityManager {
    private readonly storage;
    private readonly anonymousIdKey;
    private readonly userIdKey;
    private readonly sessionIdKey;
    constructor(storage: KeyValueStorage);
    current(): EventIdentity;
    identify(userId: string): void;
    reset(): void;
    clear(): void;
    renewSession(): void;
}
export { createId };
//# sourceMappingURL=identity.d.ts.map