import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  const response = await request.delete("/v1/events");
  expect(response.ok()).toBeTruthy();
});

test("keeps a large IndexedDB queue across repeated reloads and drains without duplication", async ({
  page,
  request,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "The bounded soak runs once; cross-engine queue behavior has focused tests.");

  const databaseName = `tracelet-soak-${Date.now()}`;
  const sessions = 10;
  const eventsPerSession = 100;
  const totalEvents = sessions * eventsPerSession;
  await page.goto("/");

  for (let session = 0; session < sessions; session += 1) {
    const pending = await page.evaluate(async ({ name, session, count }) => {
      const { createAnalytics, IndexedDbEventStorage } = await import("/dist/index.js");
      const storage = new IndexedDbEventStorage({ databaseName: name });
      const analytics = createAnalytics({
        appId: "reload-soak-e2e",
        pageLifecycle: false,
        flushIntervalMs: 60_000,
        eventStorage: storage,
        transport: {
          name: "offline-soak",
          async send() {
            return { success: false, retryable: true };
          },
        },
      });

      for (let index = 0; index < count; index += 1) {
        await analytics.track("soak_event", { sequence: session * count + index });
      }
      const snapshot = await analytics.getQueueSnapshot();
      await analytics.shutdown();
      await storage.close();
      return snapshot.pendingEvents;
    }, { name: databaseName, session, count: eventsPerSession });

    expect(pending).toBe((session + 1) * eventsPerSession);
    await page.reload();
  }

  const drained = await page.evaluate(async (name) => {
    const { createAnalytics, HttpTransport, IndexedDbEventStorage } = await import("/dist/index.js");
    const storage = new IndexedDbEventStorage({ databaseName: name });
    const analytics = createAnalytics({
      appId: "reload-soak-e2e",
      pageLifecycle: false,
      flushIntervalMs: 60_000,
      maxBatchSize: 50,
      eventStorage: storage,
      transport: new HttpTransport({ endpoint: "/v1/batch" }),
    });
    let flushes = 0;

    while ((await storage.size()) > 0 && flushes < 25) {
      await analytics.flush();
      flushes += 1;
    }
    const pending = await storage.size();
    await analytics.shutdown();
    await storage.close();
    await new Promise<void>((resolve, reject) => {
      const deletion = indexedDB.deleteDatabase(name);
      deletion.onsuccess = () => resolve();
      deletion.onerror = () => reject(deletion.error);
      deletion.onblocked = () => reject(new Error("Soak database deletion was blocked"));
    });
    return { flushes, pending };
  }, databaseName);

  expect(drained).toEqual({ flushes: 20, pending: 0 });
  const stats = await (await request.get("/v1/stats")).json();
  expect(stats).toMatchObject({
    batchRequests: 20,
    acceptedEvents: totalEvents,
    storedEvents: totalEvents,
    failedRequests: 0,
  });
  const delivered = await (await request.get(`/v1/events?limit=${totalEvents}`)).json();
  expect(delivered.events).toHaveLength(totalEvents);
  expect(new Set(delivered.events.map((event: { eventId: string }) => event.eventId)).size).toBe(totalEvents);
  expect(new Set(delivered.events.map((event: { properties: { sequence: number } }) => event.properties.sequence)).size)
    .toBe(totalEvents);
});

test("keeps ephemeral browser profiles isolated while IndexedDB remains usable", async ({ browser }) => {
  const databaseName = `tracelet-ephemeral-${Date.now()}`;
  const firstContext = await browser.newContext();
  const firstPage = await firstContext.newPage();
  await firstPage.goto("http://127.0.0.1:4318/");
  const firstSize = await firstPage.evaluate(async (name) => {
    const { createAnalytics, IndexedDbEventStorage } = await import("/dist/index.js");
    const storage = new IndexedDbEventStorage({ databaseName: name });
    const analytics = createAnalytics({
      appId: "ephemeral-e2e",
      pageLifecycle: false,
      eventStorage: storage,
      transport: { name: "offline", async send() { return { success: false, retryable: true }; } },
    });
    await analytics.track("ephemeral_event", {});
    const size = await storage.size();
    await analytics.shutdown();
    await storage.close();
    return size;
  }, databaseName);
  expect(firstSize).toBe(1);
  await firstContext.close();

  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  await secondPage.goto("http://127.0.0.1:4318/");
  const secondSize = await secondPage.evaluate(async (name) => {
    const { IndexedDbEventStorage } = await import("/dist/index.js");
    const storage = new IndexedDbEventStorage({ databaseName: name });
    const size = await storage.size();
    await storage.close();
    return size;
  }, databaseName);
  expect(secondSize).toBe(0);
  await secondContext.close();
});

test("cross-origin delivery omits cookies even when the collector origin has one", async ({ page, context, request }) => {
  await context.addCookies([{
    name: "collector_session",
    value: "must-not-be-sent",
    url: "http://localhost:4318",
  }]);
  await page.goto("/");

  const result = await page.evaluate(async () => {
    const { createAnalytics, HttpTransport, MemoryEventStorage } = await import("/dist/index.js");
    const storage = new MemoryEventStorage();
    const analytics = createAnalytics({
      appId: "cookie-free-e2e",
      pageLifecycle: false,
      eventStorage: storage,
      transport: new HttpTransport({ endpoint: "http://localhost:4318/v1/batch" }),
    });
    await analytics.track("cookie_free_event", {});
    await analytics.flush();
    const pending = await storage.size();
    await analytics.shutdown();
    return pending;
  });

  expect(result).toBe(0);
  const stats = await (await request.get("/v1/stats")).json();
  expect(stats).toMatchObject({ acceptedEvents: 1, storedEvents: 1 });
  expect(stats.requestLog[0]).toMatchObject({ hadCookie: false });
});

test("recovers through a first-party path after a client blocker aborts a vendor endpoint", async ({
  page,
  request,
  browserName,
}) => {
  const databaseName = `tracelet-blocker-${browserName}-${Date.now()}`;
  await page.route("https://analytics.vendor.invalid/**", (route) => route.abort("blockedbyclient"));
  await page.goto("/");

  const blocked = await page.evaluate(async (name) => {
    const { createAnalytics, HttpTransport, IndexedDbEventStorage } = await import("/dist/index.js");
    const storage = new IndexedDbEventStorage({ databaseName: name });
    const diagnostics: Array<{ type: string; retryable?: boolean }> = [];
    const analytics = createAnalytics({
      appId: "blocker-recovery-e2e",
      pageLifecycle: false,
      flushIntervalMs: 60_000,
      retry: { baseDelayMs: 60_000, maxDelayMs: 60_000, jitterRatio: 0 },
      eventStorage: storage,
      transport: new HttpTransport({ endpoint: "https://analytics.vendor.invalid/v1/batch" }),
      onDiagnostic(event) {
        diagnostics.push(event);
      },
    });
    await analytics.track("blocked_then_recovered", {});
    await analytics.flush();
    const pending = await storage.size();
    await analytics.shutdown();
    await storage.close();
    return { pending, diagnostics };
  }, databaseName);

  expect(blocked.pending).toBe(1);
  expect(blocked.diagnostics).toEqual(expect.arrayContaining([
    expect.objectContaining({ type: "flush_failed", retryable: true }),
  ]));

  const recovered = await page.evaluate(async (name) => {
    const { createAnalytics, HttpTransport, IndexedDbEventStorage } = await import("/dist/index.js");
    const storage = new IndexedDbEventStorage({ databaseName: name });
    const analytics = createAnalytics({
      appId: "blocker-recovery-e2e",
      pageLifecycle: false,
      eventStorage: storage,
      transport: new HttpTransport({ endpoint: "/v1/batch" }),
    });
    await analytics.flush();
    const pending = await storage.size();
    await analytics.shutdown();
    await storage.close();
    return pending;
  }, databaseName);

  expect(recovered).toBe(0);
  const body = await (await request.get("/v1/events")).json();
  expect(body.events).toEqual([
    expect.objectContaining({ name: "blocked_then_recovered" }),
  ]);
});
