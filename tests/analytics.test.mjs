import assert from "node:assert/strict";
import test from "node:test";

import {
  EventRouter,
  MemoryEventStorage,
  SDK_NAME,
  SDK_VERSION,
  createAnalytics,
} from "../dist/index.js";

test("routes contiguous events to one transport without reordering the queue", async () => {
  const storage = new MemoryEventStorage();
  const deliveries = [];
  const diagnostics = [];
  const transport = (name) => ({
    name,
    async send(batch) {
      deliveries.push({
        transport: name,
        events: JSON.parse(batch.body).events.map((event) => event.name),
      });
      return { success: true, status: 202 };
    },
  });
  const productTransport = transport("product-collector");
  const alertTransport = transport("alert-collector");
  const sdk = createAnalytics({
    appId: "test",
    eventStorage: storage,
    pageLifecycle: false,
    onDiagnostic(event) {
      if (event.type === "flush_started") diagnostics.push(event.transport);
    },
    transport: new EventRouter({
      routes: [{
        name: "errors",
        match: (event) => event.name.startsWith("$"),
        transport: alertTransport,
      }],
      fallback: productTransport,
    }),
  });

  await sdk.track("product_viewed", { productId: "p_1" });
  await sdk.track("cart_opened", {});
  await sdk.track("$error", { message: "Example" });
  await sdk.flush();
  await sdk.flush();

  assert.deepEqual(deliveries, [
    { transport: "product-collector", events: ["product_viewed", "cart_opened"] },
    { transport: "alert-collector", events: ["$error"] },
  ]);
  assert.deepEqual(diagnostics, ["product-collector", "alert-collector"]);
  assert.equal(await storage.size(), 0);
  await sdk.shutdown();
});

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

test("drops events that cannot be serialized or exceed the event byte limit", async () => {
  const storage = new MemoryEventStorage();
  const dropped = [];
  const sdk = createAnalytics({
    appId: "test",
    eventStorage: storage,
    maxEventBytes: 600,
    pageLifecycle: false,
    onDiagnostic(event) {
      if (event.type === "event_dropped") dropped.push(event.reason);
    },
    transport: { name: "test", async send() { return { success: true }; } },
  });

  const circular = {};
  circular.self = circular;
  await sdk.track("circular", circular);
  await sdk.track("oversized", { value: "x".repeat(2_000) });

  assert.equal(await storage.size(), 0);
  assert.deepEqual(dropped, ["serialization", "event-too-large"]);
  await sdk.shutdown();
});

test("splits flushes by encoded byte size without reordering events", async () => {
  const storage = new MemoryEventStorage();
  const delivered = [];
  const sdk = createAnalytics({
    appId: "test",
    eventStorage: storage,
    maxBatchBytes: 25,
    pageLifecycle: false,
    codec: {
      name: "sized",
      contentType: "application/octet-stream",
      async encode(batch) { return new Uint8Array(batch.events.length * 10); },
    },
    transport: {
      name: "capture",
      async send(batch) {
        delivered.push([...batch.eventIds]);
        return { success: true };
      },
    },
  });

  await sdk.track("first", {});
  await sdk.track("second", {});
  await sdk.track("third", {});
  await sdk.flush();
  assert.deepEqual(delivered[0].length, 2);
  assert.equal(await storage.size(), 1);
  await sdk.flush();
  assert.deepEqual(delivered.flat().length, 3);
  assert.equal(await storage.size(), 0);
  await sdk.shutdown();
});

test("drops an event when its codec output cannot fit in an empty batch", async () => {
  const storage = new MemoryEventStorage();
  const dropped = [];
  const sdk = createAnalytics({
    appId: "test",
    eventStorage: storage,
    maxBatchBytes: 5,
    pageLifecycle: false,
    codec: {
      name: "oversized",
      contentType: "application/octet-stream",
      async encode() { return new Uint8Array(10); },
    },
    onDiagnostic(event) {
      if (event.type === "event_dropped") dropped.push(event.reason);
    },
    transport: { name: "test", async send() { return { success: true }; } },
  });

  await sdk.track("cannot_fit", {});
  await sdk.flush();

  assert.equal(await storage.size(), 0);
  assert.deepEqual(dropped, ["batch-byte-limit"]);
  await sdk.shutdown();
});
