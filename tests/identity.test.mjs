import assert from "node:assert/strict";
import test from "node:test";

import { IdentityManager, MemoryKeyValueStorage } from "../dist/index.js";

test("renews a session after the configured idle timeout", () => {
  let now = 1_000;
  const identity = new IdentityManager(new MemoryKeyValueStorage(), 30_000, () => now);
  const first = identity.current();

  now += 29_999;
  const active = identity.current();
  assert.equal(active.sessionId, first.sessionId);

  now += 30_000;
  const renewed = identity.current();
  assert.notEqual(renewed.sessionId, first.sessionId);
  assert.equal(renewed.anonymousId, first.anonymousId);
});

test("reset rotates anonymous and session identities", () => {
  const identity = new IdentityManager(new MemoryKeyValueStorage());
  const before = identity.current();
  identity.identify("user-1");
  identity.reset();
  const after = identity.current();

  assert.notEqual(after.anonymousId, before.anonymousId);
  assert.notEqual(after.sessionId, before.sessionId);
  assert.equal(after.userId, undefined);
});
