import type { EventStorage, KeyValueStorage, StorageEstimate } from "./contracts.js";
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
  private readonly fallback = new MemoryKeyValueStorage();

  constructor(private readonly prefix = "et_analytics_") {}

  get(key: string): string | null {
    try {
      const storage = globalThis.localStorage;
      return storage ? storage.getItem(this.prefix + key) ?? this.fallback.get(key) : this.fallback.get(key);
    } catch {
      return this.fallback.get(key);
    }
  }

  set(key: string, value: string): void {
    try {
      const storage = globalThis.localStorage;
      if (storage) storage.setItem(this.prefix + key, value);
      else this.fallback.set(key, value);
    } catch {
      this.fallback.set(key, value);
    }
  }

  remove(key: string): void {
    try {
      const storage = globalThis.localStorage;
      if (storage) storage.removeItem(this.prefix + key);
      else this.fallback.remove(key);
    } catch {
      this.fallback.remove(key);
    }
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

export interface BrowserEventStorageOptions extends IndexedDbEventStorageOptions {
  /** Queue used when IndexedDB cannot be opened. Defaults to in-memory storage. */
  fallback?: EventStorage;
  /** Observes the one-time startup fallback; listener errors are isolated. */
  onFallback?(error: unknown): void;
}

/** Error emitted when IndexedDB rejects a write because the origin is full. */
export class StorageQuotaExceededError extends Error {
  readonly name = "StorageQuotaExceededError";

  constructor(
    readonly estimate?: StorageEstimate,
    options?: ErrorOptions,
  ) {
    super("Browser storage quota was exceeded while persisting an analytics event", options);
  }
}

/**
 * Read the browser's origin-wide storage estimate.
 *
 * The values include all storage used by the current origin, not only Tracelet's
 * IndexedDB database, and browsers may round or omit fields for privacy.
 */
export async function estimateBrowserStorage(): Promise<StorageEstimate | undefined> {
  const manager = globalThis.navigator?.storage;
  if (!manager?.estimate) return undefined;

  try {
    const raw = await manager.estimate();
    const usageBytes = finiteNumber(raw.usage);
    const quotaBytes = finiteNumber(raw.quota);
    const availableBytes = usageBytes === undefined || quotaBytes === undefined
      ? undefined
      : Math.max(0, quotaBytes - usageBytes);
    const usageRatio = usageBytes === undefined || quotaBytes === undefined || quotaBytes <= 0
      ? undefined
      : Math.min(1, Math.max(0, usageBytes / quotaBytes));
    const persisted = manager.persisted
      ? await manager.persisted().catch(() => undefined)
      : undefined;
    const rawDetails = (raw as StorageEstimate & { usageDetails?: Record<string, number> }).usageDetails;
    const usageDetails = rawDetails
      ? Object.fromEntries(
          Object.entries(rawDetails).filter((entry): entry is [string, number] => Number.isFinite(entry[1])),
        )
      : undefined;

    return {
      ...(usageBytes === undefined ? {} : { usageBytes }),
      ...(quotaBytes === undefined ? {} : { quotaBytes }),
      ...(availableBytes === undefined ? {} : { availableBytes }),
      ...(usageRatio === undefined ? {} : { usageRatio }),
      ...(persisted === undefined ? {} : { persisted }),
      ...(usageDetails === undefined ? {} : { usageDetails }),
    };
  } catch {
    return undefined;
  }
}

export function isStorageQuotaExceededError(error: unknown): boolean {
  if (error instanceof StorageQuotaExceededError) return true;
  if (!error || typeof error !== "object") return false;
  const candidate = error as { name?: unknown; code?: unknown };
  return candidate.name === "QuotaExceededError"
    || candidate.name === "NS_ERROR_DOM_QUOTA_REACHED"
    || candidate.code === 22
    || candidate.code === 1014;
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
    try {
      await this.request(store.add({ eventId: event.eventId, event } satisfies IndexedDbRecord));
      await done;
    } catch (error) {
      // Observe the transaction rejection so a failed request cannot create an
      // unrelated unhandled-rejection warning in the host application.
      await done.catch(() => undefined);
      if (isStorageQuotaExceededError(error)) {
        throw new StorageQuotaExceededError(await this.estimate(), { cause: error });
      }
      throw error;
    }
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

  /** Return an origin-wide estimate supplied by the browser Storage API. */
  estimate(): Promise<StorageEstimate | undefined> {
    return estimateBrowserStorage();
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

    const opening = new Promise<IDBDatabase>((resolve, reject) => {
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
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => {
          database.close();
          this.databasePromise = undefined;
        };
        resolve(database);
      };
      request.onerror = () => reject(request.error ?? new Error("Unable to open IndexedDB"));
      request.onblocked = () => reject(new Error("IndexedDB upgrade is blocked"));
    });
    const guarded = opening.catch((error: unknown) => {
      if (this.databasePromise === guarded) this.databasePromise = undefined;
      throw error;
    });
    this.databasePromise = guarded;
    return guarded;
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

/**
 * Select persistent browser storage when IndexedDB can be opened, otherwise
 * return an explicit fallback queue.
 *
 * The readiness probe runs before Analytics starts collecting, so a failed
 * persistent adapter cannot reject the first track() call. Runtime quota
 * failures remain visible through the regular storage diagnostics instead of
 * silently moving previously persisted events into another queue.
 */
export async function createBrowserEventStorage(
  options: BrowserEventStorageOptions = {},
): Promise<EventStorage> {
  const {
    fallback = new MemoryEventStorage(),
    onFallback,
    ...indexedDbOptions
  } = options;
  const persistent = new IndexedDbEventStorage(indexedDbOptions);

  try {
    await persistent.size();
    return persistent;
  } catch (error) {
    await persistent.close().catch(() => undefined);
    try {
      onFallback?.(error);
    } catch {
      // Observability must not make storage selection fail.
    }
    return fallback;
  }
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}
