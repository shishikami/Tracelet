import assert from "node:assert/strict";
import test from "node:test";

import {
  BrowserLocalStorage,
  MemoryEventStorage,
  StorageQuotaExceededError,
  createBrowserEventStorage,
  estimateBrowserStorage,
  isStorageQuotaExceededError,
} from "../dist/index.js";

test("normalizes an origin-wide browser storage estimate", async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      storage: {
        async estimate() {
          return {
            usage: 200,
            quota: 1_000,
            usageDetails: { indexedDB: 150, caches: Number.NaN },
          };
        },
        async persisted() { return true; },
      },
    },
  });

  try {
    assert.deepEqual(await estimateBrowserStorage(), {
      usageBytes: 200,
      quotaBytes: 1_000,
      availableBytes: 800,
      usageRatio: 0.2,
      persisted: true,
      usageDetails: { indexedDB: 150 },
    });
  } finally {
    if (original) Object.defineProperty(globalThis, "navigator", original);
    else delete globalThis.navigator;
  }
});

test("recognizes cross-realm browser quota errors", () => {
  assert.equal(isStorageQuotaExceededError(new DOMException("full", "QuotaExceededError")), true);
  assert.equal(isStorageQuotaExceededError({ name: "NS_ERROR_DOM_QUOTA_REACHED" }), true);
  assert.equal(isStorageQuotaExceededError(new StorageQuotaExceededError()), true);
  assert.equal(isStorageQuotaExceededError(new Error("network")), false);
});

test("falls back to memory when localStorage is unavailable", () => {
  const storage = new BrowserLocalStorage("test_");
  storage.set("anonymous_id", "anon-1");
  assert.equal(storage.get("anonymous_id"), "anon-1");
  storage.remove("anonymous_id");
  assert.equal(storage.get("anonymous_id"), null);
});

test("falls back to memory when localStorage throws", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new DOMException("Blocked", "SecurityError");
    },
  });

  try {
    const storage = new BrowserLocalStorage("test_");
    storage.set("session_id", "session-1");
    assert.equal(storage.get("session_id"), "session-1");
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete globalThis.localStorage;
  }
});

test("selects an explicit memory fallback when IndexedDB cannot open", async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "indexedDB");
  const fallback = new MemoryEventStorage();
  const observed = [];
  Object.defineProperty(globalThis, "indexedDB", {
    configurable: true,
    value: undefined,
  });

  try {
    const selected = await createBrowserEventStorage({
      fallback,
      onFallback(error) {
        observed.push(error);
        throw new Error("diagnostic listener failure");
      },
    });

    assert.equal(selected, fallback);
    assert.equal(observed.length, 1);
    assert.match(String(observed[0]), /IndexedDB is not supported/);
  } finally {
    if (original) Object.defineProperty(globalThis, "indexedDB", original);
    else delete globalThis.indexedDB;
  }
});
