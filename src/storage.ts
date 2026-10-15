import type { EventStorage, KeyValueStorage } from "./contracts.js";
import type { AnalyticsEvent } from "./types.js";

export class MemoryEventStorage implements EventStorage {
  private events: AnalyticsEvent[] = [];

  async push(event: AnalyticsEvent): Promise<void> {
    this.events.push(event);
  }

  async peek(limit: number): Promise<AnalyticsEvent[]> {
    return this.events.slice(0, limit);
  }

  async remove(eventIds: readonly string[]): Promise<void> {
    const ids = new Set(eventIds);
    this.events = this.events.filter((event) => !ids.has(event.eventId));
  }

  async size(): Promise<number> {
    return this.events.length;
  }

  async clear(): Promise<void> {
    this.events = [];
  }
}

export class MemoryKeyValueStorage implements KeyValueStorage {
  private readonly values = new Map<string, string>();

  get(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.values.set(key, value);
  }

  remove(key: string): void {
    this.values.delete(key);
  }
}

export class BrowserLocalStorage implements KeyValueStorage {
  constructor(private readonly prefix = "et_analytics_") {}

  get(key: string): string | null {
    return globalThis.localStorage?.getItem(this.prefix + key) ?? null;
  }

  set(key: string, value: string): void {
    globalThis.localStorage?.setItem(this.prefix + key, value);
  }

  remove(key: string): void {
    globalThis.localStorage?.removeItem(this.prefix + key);
  }
}

interface IndexedDbRecord {
  id?: number;
  eventId: string;
  event: AnalyticsEvent;
}

export interface IndexedDbEventStorageOptions {
  databaseName?: string;
  storeName?: string;
  version?: number;
}

/** Persistent FIFO queue for browser delivery retries and page reloads. */
export class IndexedDbEventStorage implements EventStorage {
  private readonly databaseName: string;
  private readonly storeName: string;
  private readonly version: number;
  private databasePromise: Promise<IDBDatabase> | undefined;

  constructor(options: IndexedDbEventStorageOptions = {}) {
    this.databaseName = options.databaseName ?? "et-analytics";
    this.storeName = options.storeName ?? "events";
    this.version = options.version ?? 1;
  }

  async push(event: AnalyticsEvent): Promise<void> {
    const { store, done } = await this.store("readwrite");
    await this.request(store.add({ eventId: event.eventId, event } satisfies IndexedDbRecord));
    await done;
  }

  async peek(limit: number): Promise<AnalyticsEvent[]> {
    if (limit <= 0) return [];
    const { store, done } = await this.store("readonly");
    const records = await this.request<IndexedDbRecord[]>(store.getAll(undefined, limit));
    await done;
    return records.map((record) => record.event);
  }

  async remove(eventIds: readonly string[]): Promise<void> {
    if (eventIds.length === 0) return;
    const { store, done } = await this.store("readwrite");
    const index = store.index("eventId");
    for (const eventId of eventIds) {
      const key = await this.request<IDBValidKey | undefined>(index.getKey(eventId));
      if (key !== undefined) store.delete(key);
    }
    await done;
  }

  async size(): Promise<number> {
    const { store, done } = await this.store("readonly");
    const count = await this.request<number>(store.count());
    await done;
    return count;
  }

  async clear(): Promise<void> {
    const { store, done } = await this.store("readwrite");
    await this.request(store.clear());
    await done;
  }

  async close(): Promise<void> {
    const database = await this.databasePromise;
    database?.close();
    this.databasePromise = undefined;
  }

  private async store(
    mode: IDBTransactionMode,
  ): Promise<{ store: IDBObjectStore; done: Promise<void> }> {
    const database = await this.open();
    const transaction = database.transaction(this.storeName, mode);
    return {
      store: transaction.objectStore(this.storeName),
      done: this.transactionDone(transaction),
    };
  }

  private open(): Promise<IDBDatabase> {
    if (this.databasePromise) return this.databasePromise;
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

  private request<T = undefined>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
    });
  }

  private transactionDone(transaction: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
      transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
    });
  }
}
