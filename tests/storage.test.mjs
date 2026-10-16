import assert from "node:assert/strict";
import test from "node:test";

import { BrowserLocalStorage } from "../dist/index.js";

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
