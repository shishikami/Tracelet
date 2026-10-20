import assert from "node:assert/strict";
import test from "node:test";

import {
  EventRouter,
  MemoryEventStorage,
  SDK_NAME,
  SDK_VERSION,
  StorageQuotaExceededError,
  createAnalytics,
} from "../dist/index.js";

test("reports IndexedDB quota exhaustion without rejecting track", async () => {
  const estimate = {
    usageBytes: 900,
    quotaBytes: 1_000,
    availableBytes: 100,
    usageRatio: 0.9,
    persisted: false,
  };
  const diagnostics = [];
  const storage = {
    async push() { throw new StorageQuotaExceededError(estimate); },
    async peek() { return []; },
    async remove() {},
    async size() { return 0; },
    async clear() {},
    async estimate() { return estimate; },
  };
  const sdk = createAnalytics({
    appId: "quota-test",
    pageLifecycle: false,
    eventStorage: storage,
    onDiagnostic(event) { diagnostics.push(event); },
    transport: { name: "test", async send() { return { success: true }; } },
  });

  await sdk.track("cannot_persist", {});

  assert.deepEqual(await sdk.getStorageEstimate(), estimate);
  assert.deepEqual(
    diagnostics.filter((event) => event.type === "event_dropped" || event.type === "storage_quota_exceeded"),
    [
      { type: "event_dropped", eventName: "cannot_persist", reason: "storage-quota" },
      { type: "storage_quota_exceeded", eventName: "cannot_persist", estimate },
    ],
  );
  await sdk.shutdown();
});

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
  assert.deepEqual((await sdk.getQueueSnapshot()).delivery, { phase: "idle", retryAttempt: 0 });
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

test("returns an immutable queue snapshot without exposing event properties", async () => {
  const estimate = { usageBytes: 128, quotaBytes: 1_024, usageDetails: { indexedDB: 128 } };
  const memory = new MemoryEventStorage();
  const storage = {
    push: (event) => memory.push(event),
    peek: (limit) => memory.peek(limit),
    remove: (ids) => memory.remove(ids),
    size: () => memory.size(),
    clear: () => memory.clear(),
    async estimate() { return estimate; },
  };
  const sdk = createAnalytics({
    appId: "snapshot-test",
    eventStorage: storage,
    pageLifecycle: false,
    flushIntervalMs: 60_000,
    transport: { name: "test", async send() { return { success: true }; } },
  });

  const empty = await sdk.getQueueSnapshot();
  assert.deepEqual(empty.delivery, { phase: "idle", retryAttempt: 0 });
  assert.equal(empty.pendingEvents, 0);

  await sdk.track("private_event", { secret: "must-not-appear" }, {
    timestamp: new Date("2026-10-20T10:00:00.000Z"),
  });
  const queued = await sdk.getQueueSnapshot();

  assert.equal(queued.pendingEvents, 1);
  assert.equal(queued.oldestEventTimestamp, "2026-10-20T10:00:00.000Z");
  assert.deepEqual(queued.storageEstimate, estimate);
  assert.equal(Object.isFrozen(queued), true);
  assert.equal(Object.isFrozen(queued.delivery), true);
  assert.equal(Object.isFrozen(queued.storageEstimate), true);
  assert.equal(Object.isFrozen(queued.storageEstimate.usageDetails), true);
  assert.doesNotMatch(JSON.stringify(queued), /must-not-appear/);
  await sdk.shutdown();
});

test("exposes one active attempt while concurrent flush calls are coalesced", async () => {
  let releaseSend;
  let notifySend;
  let sendCalls = 0;
  const sendStarted = new Promise((resolve) => { notifySend = resolve; });
  const sendBlocked = new Promise((resolve) => { releaseSend = resolve; });
  const diagnostics = [];
  const sdk = createAnalytics({
    appId: "active-attempt-test",
    pageLifecycle: false,
    flushIntervalMs: 60_000,
    transport: {
      name: "blocked",
      async send() {
        sendCalls += 1;
        notifySend();
        await sendBlocked;
        return { success: true, status: 202 };
      },
    },
  });
  sdk.subscribeDiagnostics((event) => diagnostics.push(event));

  await sdk.track("queued", {});
  const firstFlush = sdk.flush();
  const secondFlush = sdk.flush();
  await sendStarted;

  const sending = await sdk.getQueueSnapshot();
  const started = diagnostics.find((event) => event.type === "flush_started");
  assert.equal(sending.delivery.phase, "sending");
  assert.equal(sending.delivery.transport, "blocked");
  assert.equal(sending.delivery.activeAttemptId, started.attemptId);
  assert.equal(sendCalls, 1);

  releaseSend();
  await Promise.all([firstFlush, secondFlush]);
  const finished = await sdk.getQueueSnapshot();
  assert.deepEqual(finished.delivery, { phase: "idle", retryAttempt: 0 });
  assert.equal(finished.pendingEvents, 0);
  assert.equal(
    diagnostics.find((event) => event.type === "flush_succeeded").attemptId,
    started.attemptId,
  );
  await sdk.shutdown();
});

test("reports retry state and correlates a scheduled retry with its failed attempt", async () => {
  let calls = 0;
  const diagnostics = [];
  const sdk = createAnalytics({
    appId: "retry-snapshot-test",
    pageLifecycle: false,
    flushIntervalMs: 60_000,
    retry: { baseDelayMs: 60_000, maxDelayMs: 60_000, jitterRatio: 0 },
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
  sdk.subscribeDiagnostics((event) => diagnostics.push(event));

  await sdk.track("retry_me", {});
  await sdk.flush();
  const waiting = await sdk.getQueueSnapshot();
  const failed = diagnostics.find((event) => event.type === "flush_failed");
  const scheduled = diagnostics.find((event) => event.type === "flush_retry_scheduled");

  assert.equal(waiting.delivery.phase, "waiting-retry");
  assert.equal(waiting.delivery.retryAttempt, 1);
  assert.equal(waiting.delivery.nextRetryAt, scheduled.nextRetryAt);
  assert.equal(waiting.delivery.activeAttemptId, undefined);
  assert.equal(failed.attemptId, scheduled.attemptId);
  assert.equal(Date.parse(scheduled.nextRetryAt) > Date.now(), true);

  await sdk.setConsent("denied");
  const cleared = await sdk.getQueueSnapshot();
  assert.deepEqual(cleared.delivery, { phase: "idle", retryAttempt: 0 });
  assert.equal(cleared.pendingEvents, 0);

  await sdk.setConsent("granted");
  await sdk.track("recovered", {});
  await sdk.flush();
  const recovered = await sdk.getQueueSnapshot();
  assert.deepEqual(recovered.delivery, { phase: "idle", retryAttempt: 0 });
  assert.equal(recovered.pendingEvents, 0);
  await sdk.shutdown();
});

test("supports ordered runtime diagnostic subscriptions and isolates listener failures", async () => {
  const order = [];
  const sdk = createAnalytics({
    appId: "subscriber-test",
    pageLifecycle: false,
    flushIntervalMs: 60_000,
    onDiagnostic(event) {
      if (event.type === "event_enqueued") order.push("constructor");
    },
    transport: { name: "test", async send() { return { success: true }; } },
  });
  const unsubscribeFirst = sdk.subscribeDiagnostics((event) => {
    if (event.type === "event_enqueued") order.push("first");
  });
  const unsubscribeThrowing = sdk.subscribeDiagnostics((event) => {
    if (event.type === "event_enqueued") {
      order.push("throwing");
      throw new Error("diagnostic listener failures are isolated");
    }
  });
  const unsubscribeLast = sdk.subscribeDiagnostics((event) => {
    if (event.type === "event_enqueued") order.push("last");
  });

  await sdk.track("first_event", {});
  assert.deepEqual(order, ["constructor", "first", "throwing", "last"]);

  unsubscribeLast();
  unsubscribeLast();
  await sdk.track("second_event", {});
  assert.deepEqual(order.slice(4), ["constructor", "first", "throwing"]);

  unsubscribeFirst();
  unsubscribeThrowing();
  await sdk.shutdown();
});

test("keeps onDiagnostic permanent when the same function is temporarily subscribed", async () => {
  let enqueuedCalls = 0;
  const listener = (event) => {
    if (event.type === "event_enqueued") enqueuedCalls += 1;
  };
  const sdk = createAnalytics({
    appId: "permanent-listener-test",
    pageLifecycle: false,
    flushIntervalMs: 60_000,
    onDiagnostic: listener,
    transport: { name: "test", async send() { return { success: true }; } },
  });
  const unsubscribe = sdk.subscribeDiagnostics(listener);

  await sdk.track("twice", {});
  assert.equal(enqueuedCalls, 2);
  unsubscribe();
  await sdk.track("permanent_only", {});
  assert.equal(enqueuedCalls, 3);
  await sdk.shutdown();
});
