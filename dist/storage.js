export class MemoryEventStorage {
    events = [];
    async push(event) {
        this.events.push(event);
    }
    async peek(limit) {
        return this.events.slice(0, limit);
    }
    async remove(eventIds) {
        const ids = new Set(eventIds);
        this.events = this.events.filter((event) => !ids.has(event.eventId));
    }
    async size() {
        return this.events.length;
    }
    async clear() {
        this.events = [];
    }
}
export class MemoryKeyValueStorage {
    values = new Map();
    get(key) {
        return this.values.get(key) ?? null;
    }
    set(key, value) {
        this.values.set(key, value);
    }
    remove(key) {
        this.values.delete(key);
    }
}
export class BrowserLocalStorage {
    prefix;
    constructor(prefix = "et_analytics_") {
        this.prefix = prefix;
    }
    get(key) {
        return globalThis.localStorage?.getItem(this.prefix + key) ?? null;
    }
    set(key, value) {
        globalThis.localStorage?.setItem(this.prefix + key, value);
    }
    remove(key) {
        globalThis.localStorage?.removeItem(this.prefix + key);
    }
}
/** Persistent FIFO queue for browser delivery retries and page reloads. */
export class IndexedDbEventStorage {
    databaseName;
    storeName;
    version;
    databasePromise;
    constructor(options = {}) {
        this.databaseName = options.databaseName ?? "et-analytics";
        this.storeName = options.storeName ?? "events";
        this.version = options.version ?? 1;
    }
    async push(event) {
        const { store, done } = await this.store("readwrite");
        await this.request(store.add({ eventId: event.eventId, event }));
        await done;
    }
    async peek(limit) {
        if (limit <= 0)
            return [];
        const { store, done } = await this.store("readonly");
        const records = await this.request(store.getAll(undefined, limit));
        await done;
        return records.map((record) => record.event);
    }
    async remove(eventIds) {
        if (eventIds.length === 0)
            return;
        const { store, done } = await this.store("readwrite");
        const index = store.index("eventId");
        for (const eventId of eventIds) {
            const key = await this.request(index.getKey(eventId));
            if (key !== undefined)
                store.delete(key);
        }
        await done;
    }
    async size() {
        const { store, done } = await this.store("readonly");
        const count = await this.request(store.count());
        await done;
        return count;
    }
    async clear() {
        const { store, done } = await this.store("readwrite");
        await this.request(store.clear());
        await done;
    }
    async close() {
        const database = await this.databasePromise;
        database?.close();
        this.databasePromise = undefined;
    }
    async store(mode) {
        const database = await this.open();
        const transaction = database.transaction(this.storeName, mode);
        return {
            store: transaction.objectStore(this.storeName),
            done: this.transactionDone(transaction),
        };
    }
    open() {
        if (this.databasePromise)
            return this.databasePromise;
        if (typeof indexedDB === "undefined") {
            return Promise.reject(new Error("IndexedDB is not supported in this environment"));
        }
        this.databasePromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(this.databaseName, this.version);
            request.onupgradeneeded = () => {
                const database = request.result;
                if (!database.objectStoreNames.contains(this.storeName)) {
                    const store = database.createObjectStore(this.storeName, {
                        keyPath: "id",
                        autoIncrement: true,
                    });
                    store.createIndex("eventId", "eventId", { unique: true });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error ?? new Error("Unable to open IndexedDB"));
            request.onblocked = () => reject(new Error("IndexedDB upgrade is blocked"));
        });
        return this.databasePromise;
    }
    request(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
        });
    }
    transactionDone(transaction) {
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
            transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
        });
    }
}
//# sourceMappingURL=storage.js.map