import assert from "node:assert/strict";
import test from "node:test";

import {
  MemoryEventStorage,
  SDK_NAME,
  SDK_VERSION,
  createAnalytics,
} from "../dist/index.js";

test("flushes a typed event and removes it from storage", async () => {
  const storage = new MemoryEventStorage();
  const diagnostics = [];
  let delivered = 0;
  const sdk = createAnalytics({
    appId: "test",
    eventStorage: storage,
    pageLifecycle: false,
    flushIntervalMs: 60_000,
    onDiagnostic: (event) => diagnostics.push(event.type),
    transport: {
      name: "test",
      async send(batch) {
        delivered += batch.eventIds.length;
        return { success: true, status: 202 };
      },
    },
  });

  await sdk.track("product_viewed", { productId: "p_1" });
  assert.equal(await storage.size(), 1);
  await sdk.flush();
  assert.equal(delivered, 1);
  assert.equal(await storage.size(), 0);
  assert.ok(diagnostics.includes("flush_succeeded"));
  await sdk.shutdown();
});

test("does not create events before consent is granted", async () => {
  const storage = new MemoryEventStorage();
  const sdk = createAnalytics({
    appId: "test",
    eventStorage: storage,
    pageLifecycle: false,
    consent: { initialState: "pending" },
    transport: { name: "test", async send() { return { success: true }; } },
  });

  await sdk.track("blocked", {});
  assert.equal(await storage.size(), 0);
  await sdk.setConsent("granted");
  await sdk.track("allowed", {});
  assert.equal(await storage.size(), 1);
  await sdk.setConsent("denied");
  assert.equal(await storage.size(), 0);
  await sdk.shutdown();
});

test("allows a plugin to drop an event by returning null", async () => {
  const storage = new MemoryEventStorage();
  const sdk = createAnalytics({
    appId: "test",
    eventStorage: storage,
    pageLifecycle: false,
    plugins: [{ name: "drop", beforeTrack: () => null }],
    transport: { name: "test", async send() { return { success: true }; } },
  });

  await sdk.track("discarded", {});
  assert.equal(await storage.size(), 0);
  await sdk.shutdown();
});

test("retries a transient delivery failure with exponential backoff", async () => {
  let calls = 0;
  const sdk = createAnalytics({
    appId: "test",
    pageLifecycle: false,
    flushIntervalMs: 60_000,
    retry: { baseDelayMs: 5, maxDelayMs: 5, jitterRatio: 0 },
    transport: {
      name: "flaky",
      async send() {
        calls += 1;
        return calls === 1
          ? { success: false, retryable: true, status: 503 }
          : { success: true, status: 202 };
      },
    },
  });

  await sdk.track("retry_me", {});
  await sdk.flush();
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(calls, 2);
  await sdk.shutdown();
});

test("reports the published package name and version in event context", async () => {
  let payload;
  const sdk = createAnalytics({
    appId: "test",
    pageLifecycle: false,
    transport: {
      name: "capture",
      async send(batch) {
        payload = JSON.parse(batch.body);
        return { success: true };
      },
    },
  });

  await sdk.track("metadata", {});
  await sdk.flush();
  assert.deepEqual(payload.events[0].context.sdk, {
    name: SDK_NAME,
    version: SDK_VERSION,
  });
  await sdk.shutdown();
});

test("removes events after a non-retryable delivery response", async () => {
  const storage = new MemoryEventStorage();
  const sdk = createAnalytics({
    appId: "test",
    eventStorage: storage,
    pageLifecycle: false,
    transport: {
      name: "bad-request",
      async send() {
        return { success: false, retryable: false, status: 400 };
      },
    },
  });

  await sdk.track("invalid", {});
  await sdk.flush();
  assert.equal(await storage.size(), 0);
  await sdk.shutdown();
});

test("initializes plugins once and tears them down once", async () => {
  let setupCalls = 0;
  let teardownCalls = 0;
  const sdk = createAnalytics({
    appId: "test",
    pageLifecycle: false,
    plugins: [{
      name: "lifecycle",
      setup() { setupCalls += 1; },
      teardown() { teardownCalls += 1; },
    }],
    transport: { name: "test", async send() { return { success: true }; } },
  });

  await sdk.init();
  await sdk.init();
  assert.equal(setupCalls, 1);

  await sdk.shutdown();
  assert.equal(teardownCalls, 1);
});

test("rolls back initialized plugins when a later setup fails", async () => {
  let teardownCalls = 0;
  const sdk = createAnalytics({
    appId: "test",
    pageLifecycle: false,
    plugins: [
      {
        name: "initialized",
        teardown() { teardownCalls += 1; },
      },
      {
        name: "broken",
        setup() { throw new Error("Plugin setup failed"); },
      },
    ],
    transport: { name: "test", async send() { return { success: true }; } },
  });

  await assert.rejects(() => sdk.init(), /Plugin setup failed/);
  assert.equal(teardownCalls, 1);
});
