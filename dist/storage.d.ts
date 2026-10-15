import type { EventStorage, KeyValueStorage } from "./contracts.js";
import type { AnalyticsEvent } from "./types.js";
export declare class MemoryEventStorage implements EventStorage {
    private events;
    push(event: AnalyticsEvent): Promise<void>;
    peek(limit: number): Promise<AnalyticsEvent[]>;
    remove(eventIds: readonly string[]): Promise<void>;
    size(): Promise<number>;
    clear(): Promise<void>;
}
export declare class MemoryKeyValueStorage implements KeyValueStorage {
    private readonly values;
    get(key: string): string | null;
    set(key: string, value: string): void;
    remove(key: string): void;
}
export declare class BrowserLocalStorage implements KeyValueStorage {
    private readonly prefix;
    constructor(prefix?: string);
    get(key: string): string | null;
    set(key: string, value: string): void;
    remove(key: string): void;
}
export interface IndexedDbEventStorageOptions {
    databaseName?: string;
    storeName?: string;
    version?: number;
}
/** Persistent FIFO queue for browser delivery retries and page reloads. */
export declare class IndexedDbEventStorage implements EventStorage {
    private readonly databaseName;
    private readonly storeName;
    private readonly version;
    private databasePromise;
    constructor(options?: IndexedDbEventStorageOptions);
    push(event: AnalyticsEvent): Promise<void>;
    peek(limit: number): Promise<AnalyticsEvent[]>;
    remove(eventIds: readonly string[]): Promise<void>;
    size(): Promise<number>;
    clear(): Promise<void>;
    close(): Promise<void>;
    private store;
    private open;
    private request;
    private transactionDone;
}
//# sourceMappingURL=storage.d.ts.map