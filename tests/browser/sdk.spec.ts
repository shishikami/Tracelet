import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  const response = await request.delete("/v1/events");
  expect(response.ok()).toBeTruthy();
});

test("injects the Vercel Web Analytics client without cookies", async ({ page }) => {
  await page.route("**/_vercel/insights/script.js", (route) =>
    route.fulfill({ contentType: "application/javascript", body: "" }),
  );

  await page.goto("/");

  await expect(page.locator('script[src="/_vercel/insights/script.js"]')).toHaveCount(1);
  await expect(page.locator("footer")).toContainText("Vercel Web Analytics");
  await expect(page.locator("footer")).toContainText("不采集 Playground 输入、事件属性或用户身份");
  expect(await page.context().cookies()).toEqual([]);

  const filterResultBeforeOptOut = await page.evaluate(() => {
    const queued = window.vaq?.findLast(([name]) => name === "beforeSend");
    const beforeSend = queued?.[1] as ((event: { type: string; url: string }) => unknown) | undefined;
    return beforeSend?.({ type: "pageview", url: window.location.href }) ?? null;
  });
  expect(filterResultBeforeOptOut).not.toBeNull();

  await page.getByRole("button", { name: "关闭匿名统计" }).click();
  await expect(page.getByRole("button", { name: "启用匿名统计" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("tracelet.site-analytics.v1"))).toBe("disabled");

  const filterResultAfterOptOut = await page.evaluate(() => {
    const queued = window.vaq?.findLast(([name]) => name === "beforeSend");
    const beforeSend = queued?.[1] as ((event: { type: string; url: string }) => unknown) | undefined;
    return beforeSend?.({ type: "pageview", url: window.location.href }) ?? null;
  });
  expect(filterResultAfterOptOut).toBeNull();

  await page.reload();
  await expect(page.getByRole("button", { name: "启用匿名统计" })).toBeVisible();
});

test("respects the browser Global Privacy Control signal", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "globalPrivacyControl", {
      configurable: true,
      value: true,
    });
  });
  await page.route("**/_vercel/insights/script.js", (route) =>
    route.fulfill({ contentType: "application/javascript", body: "" }),
  );

  await page.goto("/en");

  await expect(page.getByText("Analytics disabled by your browser privacy signal.")).toBeVisible();
  await expect(page.getByRole("button", { name: /anonymous analytics/i })).toHaveCount(0);
  const filterResult = await page.evaluate(() => {
    const queued = window.vaq?.findLast(([name]) => name === "beforeSend");
    const beforeSend = queued?.[1] as ((event: { type: string; url: string }) => unknown) | undefined;
    return beforeSend?.({ type: "pageview", url: window.location.href }) ?? null;
  });
  expect(filterResult).toBeNull();
});

test("searches localized documentation with keyboard navigation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "搜索文档" }).click();
  const chineseDialog = page.getByRole("dialog", { name: "搜索文档" });
  await expect(chineseDialog).toBeVisible();
  await chineseDialog.getByRole("searchbox", { name: "搜索关键词" }).fill("配额");
  await chineseDialog.getByRole("link", { name: /浏览器存储配额/ }).click();
  await expect(page).toHaveURL(/\/quickstart#manual-storage$/);
  await expect(chineseDialog).not.toBeVisible();

  await page.goto("/en");
  await page.keyboard.press("Control+k");
  const englishDialog = page.getByRole("dialog", { name: "Search documentation" });
  await expect(englishDialog).toBeVisible();
  const searchbox = englishDialog.getByRole("searchbox", { name: "Search query" });
  await searchbox.fill("React Next.js");
  const frameworkResult = englishDialog.getByRole("link", { name: /React, Vue and Next\.js/ });
  await expect(frameworkResult).toBeVisible();
  await searchbox.press("ArrowDown");
  await expect(frameworkResult).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/en\/quickstart#manual-frameworks$/);
  await expect(englishDialog).not.toBeVisible();

  await page.getByRole("button", { name: "Search documentation" }).click();
  const objectDialog = page.getByRole("dialog", { name: "Search documentation" });
  await objectDialog.getByRole("searchbox", { name: "Search query" }).fill("ProtobufCodec");
  await objectDialog.getByRole("link", { name: /Codec and Compression/ }).click();
  await expect(page).toHaveURL(/\/en\/examples#manual-object-processing$/);
  await expect(page.getByRole("heading", { name: "Codec and Compression: how request bodies are built" })).toBeVisible();
});

test("keeps the manual table of contents compact on smaller screens", async ({ page }) => {
  await page.setViewportSize({ width: 690, height: 900 });
  await page.goto("/quickstart#manual");

  const contents = page.getByTestId("manual-mobile-contents");
  await expect(contents).not.toHaveAttribute("open", "");
  await contents.locator("summary").click();
  await expect(contents).toHaveAttribute("open", "");
  await contents.getByRole("link", { name: "核心 API" }).click();

  await expect(page).toHaveURL(/\/quickstart#manual-api$/);
  await expect(contents).not.toHaveAttribute("open", "");
  await expect(page.getByRole("heading", { name: "2. 定义事件并调用核心 API" })).toBeVisible();
});

test("serves focused documentation pages with shared navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "每一个事件，都有迹可循。" })).toBeVisible();
  await expect(page.locator("#manual-setup")).toHaveCount(0);

  await page.goto("/examples");
  await expect(page.getByRole("heading", { name: "面向真实项目的场景示例" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "文档导航" }).first()).toContainText("Transport 与路由");

  await page.goto("/reference");
  await expect(page.getByRole("heading", { name: "准确查询每一个公开 API" })).toBeVisible();
  await expect(page.locator("#api-client")).toContainText("track(name, properties, options?)");

  await page.goto("/en/quickstart");
  await expect(page.getByRole("heading", { name: "From first install to production delivery" })).toBeVisible();
  await expect(page.getByRole("link", { name: "中文" })).toHaveAttribute("href", "/quickstart");
});

test("runs the real SDK in the browser playground and demonstrates retry", async ({ page }) => {
  await page.goto("/playground");

  await expect(page.getByRole("heading", { name: "亲手观察从 track() 到投递的每一步。" })).toBeVisible();
  await page.getByRole("button", { name: "track()" }).click();
  await expect(page.getByText("已入队 product_viewed")).toBeVisible();
  await expect(page.getByText("队列", { exact: true }).locator("..")).toContainText("1");

  await page.getByRole("button", { name: "模拟下次失败" }).click();
  await expect(page.getByText("Collector 状态").locator("..")).toContainText("Next: 503");
  await page.getByRole("button", { name: "发送队列" }).click();
  await expect(page.getByText("模拟 Collector 返回 503")).toBeVisible();
  await expect(page.getByText("Collector 状态").locator("..")).toContainText("HTTP 503");
  await expect(page.getByText("队列", { exact: true }).locator("..")).toContainText("1");
  await expect(page.locator("pre").first()).toContainText("product_viewed");

  await page.getByRole("button", { name: "发送队列" }).click();
  await expect(page.getByText("模拟 Collector 返回 202")).toBeVisible();
  await expect(page.getByText("Collector 状态").locator("..")).toContainText("HTTP 202");
  await expect(page.getByText("队列", { exact: true }).locator("..")).toContainText("0");
  await expect(page.getByText("已投递", { exact: true }).locator("..")).toContainText("1");

  await page.goto("/en/playground");
  await expect(page.getByRole("heading", { name: "See every step from track() to delivery." })).toBeVisible();
  await expect(page.getByRole("link", { name: "中文" })).toHaveAttribute("href", "/playground");
});

test("publishes runnable starters and the bilingual architecture guide", async ({ page }) => {
  await page.goto("/examples#starters");
  await expect(page.getByRole("heading", { name: "一键运行模板" })).toBeVisible();
  await expect(page.getByRole("link", { name: /React \+ Vite/ })).toHaveAttribute("href", /stackblitz\.com\/fork\/github\/shishikami\/Tracelet/);
  await expect(page.getByRole("link", { name: /Vercel Collector/ })).toHaveAttribute("href", /vercel\.com\/new\/clone/);

  await page.goto("/guides/backend-agnostic-analytics-sdk");
  await expect(page.getByRole("heading", { name: "如何设计一个与后端解耦的浏览器埋点 SDK" })).toBeVisible();
  await expect(page.locator("#guide-contracts")).toContainText("Transport");

  await page.goto("/en/guides/backend-agnostic-analytics-sdk");
  await expect(page.getByRole("heading", { name: "Designing a backend-agnostic browser analytics SDK" })).toBeVisible();
  await expect(page.getByRole("link", { name: "中文" })).toHaveAttribute("href", "/guides/backend-agnostic-analytics-sdk");
});

test("sends a browser event through the real collector", async ({ page, request, browserName }) => {
  await page.goto("/");

  const captured = await page.evaluate(async (name) => {
    const { createAnalytics, HttpTransport, IndexedDbEventStorage, SDK_VERSION } = await import("/dist/index.js");
    const storage = new IndexedDbEventStorage({ databaseName: `tracelet-e2e-${name}` });
    const diagnostics: Array<{ type: string; eventId?: string }> = [];
    const analytics = createAnalytics({
      appId: "browser-e2e",
      pageLifecycle: false,
      eventStorage: storage,
      transport: new HttpTransport({ endpoint: "/v1/batch" }),
      onDiagnostic(event) {
        diagnostics.push(event);
      },
    });

    await analytics.track("browser_event", { browser: name });
    await analytics.flush();
    await analytics.shutdown();
    await storage.close();
    return {
      eventId: diagnostics.find((event) => event.type === "event_enqueued")?.eventId,
      sdkVersion: SDK_VERSION,
    };
  }, browserName);

  expect(captured.eventId).toBeTruthy();
  const response = await request.get("/v1/events");
  const body = await response.json();
  expect(body.count).toBe(1);
  expect(body.events[0]).toMatchObject({
    eventId: captured.eventId,
    name: "browser_event",
    properties: { browser: browserName },
    context: { sdk: { name: "tracelet-browser", version: captured.sdkVersion } },
  });
});

test("flushes the queue with the page-hide lifecycle reason", async ({ page, request }) => {
  await page.goto("/");

  const result = await page.evaluate(async () => {
    const { createAnalytics, HttpTransport, MemoryEventStorage } = await import("/dist/index.js");
    const storage = new MemoryEventStorage();
    const diagnostics: Array<{ type: string; reason?: string }> = [];
    const analytics = createAnalytics({
      appId: "pagehide-e2e",
      eventStorage: storage,
      flushIntervalMs: 60_000,
      transport: new HttpTransport({ endpoint: "/v1/batch" }),
      onDiagnostic(event) {
        diagnostics.push(event);
      },
    });

    await analytics.track("pagehide_event", { source: "lifecycle" });
    dispatchEvent(new Event("pagehide"));

    const deadline = Date.now() + 3_000;
    while (await storage.size() !== 0) {
      if (Date.now() >= deadline) throw new Error("pagehide flush did not finish");
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    const remaining = await storage.size();
    await analytics.shutdown();
    return { diagnostics, remaining };
  });

  expect(result.remaining).toBe(0);
  expect(result.diagnostics).toEqual(expect.arrayContaining([
    expect.objectContaining({ type: "flush_started", reason: "page-hide" }),
    expect.objectContaining({ type: "flush_succeeded" }),
  ]));
  const body = await (await request.get("/v1/events")).json();
  expect(body.events).toEqual([
    expect.objectContaining({ name: "pagehide_event", properties: { source: "lifecycle" } }),
  ]);
});

test("compresses a browser batch with gzip before delivery", async ({ page, request }) => {
  await page.goto("/");

  const result = await page.evaluate(async () => {
    const {
      createAnalytics,
      GzipCompression,
      HttpTransport,
      MemoryEventStorage,
    } = await import("/dist/index.js");
    const storage = new MemoryEventStorage();
    const analytics = createAnalytics({
      appId: "gzip-e2e",
      pageLifecycle: false,
      eventStorage: storage,
      compression: new GzipCompression(),
      transport: new HttpTransport({ endpoint: "/v1/batch" }),
    });

    await analytics.track("gzip_event", { compressed: true });
    await analytics.flush();
    const remaining = await storage.size();
    await analytics.shutdown();
    return { remaining };
  });

  expect(result.remaining).toBe(0);
  const stats = await (await request.get("/v1/stats")).json();
  expect(stats).toMatchObject({ batchRequests: 1, acceptedEvents: 1, failedRequests: 0 });
  expect(stats.requestLog[0]).toMatchObject({
    status: 202,
    accepted: 1,
    contentEncoding: "gzip",
    declaredEventCount: "1",
  });
  const body = await (await request.get("/v1/events")).json();
  expect(body.events[0]).toMatchObject({ name: "gzip_event", properties: { compressed: true } });
});

test("recovers automatically after a retryable collector failure", async ({ page, request }) => {
  const configured = await request.post("/v1/control/failure", {
    data: { count: 1, status: 503 },
  });
  expect(configured.ok()).toBeTruthy();
  await page.goto("/");

  const result = await page.evaluate(async () => {
    const { createAnalytics, HttpTransport, MemoryEventStorage } = await import("/dist/index.js");
    const storage = new MemoryEventStorage();
    const diagnostics: Array<{
      type: string;
      status?: number;
      retryable?: boolean;
      attempt?: number;
    }> = [];
    const analytics = createAnalytics({
      appId: "recovery-e2e",
      pageLifecycle: false,
      eventStorage: storage,
      flushIntervalMs: 60_000,
      retry: { baseDelayMs: 10, maxDelayMs: 10, jitterRatio: 0 },
      transport: new HttpTransport({ endpoint: "/v1/batch" }),
      onDiagnostic(event) {
        diagnostics.push(event);
      },
    });

    await analytics.track("recovered_event", { recovered: true });
    await analytics.flush();

    const deadline = Date.now() + 3_000;
    while (await storage.size() !== 0) {
      if (Date.now() >= deadline) throw new Error("retry did not recover the queued event");
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    const remaining = await storage.size();
    await analytics.shutdown();
    return { diagnostics, remaining };
  });

  expect(result.remaining).toBe(0);
  expect(result.diagnostics).toEqual(expect.arrayContaining([
    expect.objectContaining({ type: "flush_failed", status: 503, retryable: true }),
    expect.objectContaining({ type: "flush_retry_scheduled", attempt: 1 }),
    expect.objectContaining({ type: "flush_succeeded", status: 202 }),
  ]));
  const stats = await (await request.get("/v1/stats")).json();
  expect(stats).toMatchObject({
    batchRequests: 2,
    acceptedEvents: 1,
    failedRequests: 1,
    storedEvents: 1,
    failureControl: { remaining: 0 },
  });
  expect(stats.requestLog.map((entry: { status: number }) => entry.status)).toEqual([202, 503]);
  const body = await (await request.get("/v1/events")).json();
  expect(body.events[0]).toMatchObject({
    name: "recovered_event",
    properties: { recovered: true },
  });
});

test("routes event batches to different HTTP collectors", async ({ page, request }) => {
  await page.goto("/");

  const result = await page.evaluate(async () => {
    const {
      createAnalytics,
      EventRouter,
      HttpTransport,
      MemoryEventStorage,
    } = await import("/dist/index.js");
    const storage = new MemoryEventStorage();
    const analytics = createAnalytics({
      appId: "routing-e2e",
      pageLifecycle: false,
      eventStorage: storage,
      transport: new EventRouter({
        routes: [{
          name: "errors",
          match: (event) => event.name === "$error",
          transport: new HttpTransport({
            endpoint: "/v1/batch/alerts",
            name: "alerts",
          }),
        }],
        fallback: new HttpTransport({
          endpoint: "/v1/batch/analytics",
          name: "analytics",
        }),
      }),
    });

    await analytics.track("product_viewed", { productId: "p_1" });
    await analytics.track("$error", { message: "Example" });
    await analytics.flush();
    await analytics.flush();
    const remaining = await storage.size();
    await analytics.shutdown();
    return { remaining };
  });

  expect(result.remaining).toBe(0);
  const stats = await (await request.get("/v1/stats")).json();
  expect(stats).toMatchObject({ batchRequests: 2, acceptedEvents: 2, failedRequests: 0 });
  expect(stats.requestLog.map((entry: { path: string }) => entry.path)).toEqual([
    "/v1/batch/alerts",
    "/v1/batch/analytics",
  ]);
  const body = await (await request.get("/v1/events")).json();
  expect(body.events.map((event: { name: string }) => event.name)).toEqual([
    "$error",
    "product_viewed",
  ]);
});

test("reports browser storage quota estimates through IndexedDB storage", async ({ page, browserName }) => {
  await page.goto("/");

  const result = await page.evaluate(async (name) => {
    const {
      IndexedDbEventStorage,
      estimateBrowserStorage,
    } = await import("/dist/index.js");
    const storage = new IndexedDbEventStorage({ databaseName: `tracelet-quota-${name}` });
    const direct = await estimateBrowserStorage();
    const throughStorage = await storage.estimate();
    await storage.close();
    return { direct, throughStorage };
  }, browserName);

  for (const estimate of [result.direct, result.throughStorage]) {
    expect(estimate).toBeTruthy();
    expect(estimate.quotaBytes).toBeGreaterThan(0);
    expect(estimate.usageBytes).toBeGreaterThanOrEqual(0);
    expect(estimate.availableBytes).toBeGreaterThanOrEqual(0);
    expect(estimate.usageRatio).toBeGreaterThanOrEqual(0);
    expect(estimate.usageRatio).toBeLessThanOrEqual(1);
  }
});

test("does not create or deliver events before consent", async ({ page, request }) => {
  await page.goto("/");

  const result = await page.evaluate(async () => {
    const { createAnalytics, HttpTransport, MemoryEventStorage } = await import("/dist/index.js");
    const storage = new MemoryEventStorage();
    const analytics = createAnalytics({
      appId: "consent-e2e",
      pageLifecycle: false,
      eventStorage: storage,
      consent: { initialState: "pending" },
      transport: new HttpTransport({ endpoint: "/v1/batch" }),
    });

    await analytics.track("blocked_event", {});
    const before = await storage.size();
    await analytics.setConsent("granted");
    await analytics.track("allowed_event", {});
    await analytics.flush();
    await analytics.shutdown();
    return { before, after: await storage.size() };
  });

  expect(result).toEqual({ before: 0, after: 0 });
  const body = await (await request.get("/v1/events")).json();
  expect(body.events.map((event: { name: string }) => event.name)).toEqual(["allowed_event"]);
});

test("recovers an IndexedDB queue after a page reload", async ({ page, request, browserName }) => {
  const databaseName = `tracelet-reload-${browserName}-${Date.now()}`;
  await page.goto("/");

  await page.evaluate(async (name) => {
    const { createAnalytics, IndexedDbEventStorage } = await import("/dist/index.js");
    const storage = new IndexedDbEventStorage({ databaseName: name });
    const analytics = createAnalytics({
      appId: "reload-e2e",
      pageLifecycle: false,
      eventStorage: storage,
      transport: { name: "offline", async send() { return { success: false, retryable: true }; } },
    });
    await analytics.track("persisted_event", { source: "before-reload" });
    await analytics.shutdown();
    await storage.close();
  }, databaseName);

  await page.reload();
  const remaining = await page.evaluate(async (name) => {
    const { createAnalytics, HttpTransport, IndexedDbEventStorage } = await import("/dist/index.js");
    const storage = new IndexedDbEventStorage({ databaseName: name });
    const analytics = createAnalytics({
      appId: "reload-e2e",
      pageLifecycle: false,
      eventStorage: storage,
      transport: new HttpTransport({ endpoint: "/v1/batch" }),
    });
    await analytics.flush();
    const size = await storage.size();
    await analytics.shutdown();
    await storage.close();
    return size;
  }, databaseName);

  expect(remaining).toBe(0);
  const body = await (await request.get("/v1/events")).json();
  expect(body.events).toHaveLength(1);
  expect(body.events[0]).toMatchObject({ name: "persisted_event", properties: { source: "before-reload" } });
});

test("coordinates a shared IndexedDB queue across tabs", async ({ page, request, browserName }) => {
  const secondPage = await page.context().newPage();
  const databaseName = `tracelet-tabs-${browserName}-${Date.now()}`;
  await Promise.all([page.goto("/"), secondPage.goto("/")]);

  async function enqueueOffline(target: typeof page, source: string) {
    await target.evaluate(async ({ name, source }) => {
      const { createAnalytics, IndexedDbEventStorage } = await import("/dist/index.js");
      const storage = new IndexedDbEventStorage({ databaseName: name });
      const analytics = createAnalytics({
        appId: "tabs-e2e",
        pageLifecycle: false,
        eventStorage: storage,
        transport: { name: "offline", async send() { return { success: false, retryable: true }; } },
      });
      await analytics.track("tab_event", { source });
      await analytics.shutdown();
      await storage.close();
    }, { name: databaseName, source });
  }

  await enqueueOffline(page, "first");
  await enqueueOffline(secondPage, "second");

  async function flushSharedQueue(target: typeof page) {
    return target.evaluate(async (name) => {
      const { createAnalytics, HttpTransport, IndexedDbEventStorage } = await import("/dist/index.js");
      const storage = new IndexedDbEventStorage({ databaseName: name });
      const analytics = createAnalytics({
        appId: "tabs-e2e",
        pageLifecycle: false,
        eventStorage: storage,
        transport: new HttpTransport({ endpoint: "/v1/batch" }),
      });
      await analytics.flush();
      const remaining = await storage.size();
      await analytics.shutdown();
      await storage.close();
      return remaining;
    }, databaseName);
  }

  await Promise.all([flushSharedQueue(page), flushSharedQueue(secondPage)]);
  const body = await (await request.get("/v1/events")).json();
  expect(body.events).toHaveLength(2);
  expect(new Set(body.events.map((event: { eventId: string }) => event.eventId)).size).toBe(2);
  expect(body.events.map((event: { properties: { source: string } }) => event.properties.source).sort())
    .toEqual(["first", "second"]);
  await secondPage.close();
});

test("autocaptures navigation and errors, then removes listeners on shutdown", async ({ page }) => {
  await page.goto("/");

  const result = await page.evaluate(async () => {
    const {
      MemoryEventStorage,
      createAnalytics,
      createAutoCapturePlugin,
    } = await import("/dist/index.js");
    const storage = new MemoryEventStorage();
    const analytics = createAnalytics({
      appId: "autocapture-e2e",
      pageLifecycle: false,
      eventStorage: storage,
      flushIntervalMs: 60_000,
      plugins: [createAutoCapturePlugin({ pageViews: true, errors: true })],
      transport: { name: "offline", async send() { return { success: false, retryable: true }; } },
    });

    await analytics.init();
    history.pushState({}, "", "/products?token=hidden#private-fragment");
    dispatchEvent(new ErrorEvent("error", {
      message: "Example failure",
      filename: "https://example.com/app.js?token=hidden",
      lineno: 12,
      colno: 8,
      error: new Error("Example failure"),
    }));

    await new Promise((resolve) => setTimeout(resolve, 20));
    const beforeShutdown = await storage.peek(10);
    await analytics.shutdown();

    history.pushState({}, "", "/after-shutdown");
    dispatchEvent(new ErrorEvent("error", { message: "Ignored after shutdown" }));
    await new Promise((resolve) => setTimeout(resolve, 20));

    return {
      beforeShutdown: beforeShutdown.map((event) => ({
        name: event.name,
        properties: event.properties,
        pageUrl: event.context.page?.url,
      })),
      finalSize: await storage.size(),
    };
  });

  expect(result.beforeShutdown).toHaveLength(3);
  expect(result.beforeShutdown[0]).toMatchObject({ properties: { trigger: "initial", path: "/" } });
  expect(result.beforeShutdown[1]).toMatchObject({
    properties: { trigger: "pushState", path: "/products", previousPath: "/" },
    pageUrl: "http://127.0.0.1:4318/products",
  });
  expect(result.beforeShutdown[2]).toMatchObject({
    name: "$error",
    properties: {
      errorType: "Error",
      message: "Example failure",
      filename: "https://example.com/app.js",
      line: 12,
      column: 8,
    },
  });
  expect(result.finalSize).toBe(3);
});

test("autocapture respects consent and explicit hash routing", async ({ page }) => {
  await page.goto("/");

  const events = await page.evaluate(async () => {
    const {
      MemoryEventStorage,
      createAnalytics,
      createAutoCapturePlugin,
    } = await import("/dist/index.js");
    const storage = new MemoryEventStorage();
    const analytics = createAnalytics({
      appId: "autocapture-consent-e2e",
      pageLifecycle: false,
      eventStorage: storage,
      consent: { initialState: "pending" },
      plugins: [createAutoCapturePlugin({
        pageViews: { initial: true, includeHash: true },
        errors: true,
      })],
      transport: { name: "offline", async send() { return { success: false, retryable: true }; } },
    });

    await analytics.init();
    dispatchEvent(new ErrorEvent("error", { message: "Blocked before consent" }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    if (await storage.size() !== 0) throw new Error("Autocapture bypassed consent");

    await analytics.setConsent("granted");
    history.replaceState({}, "", "/app#dashboard");
    dispatchEvent(new PromiseRejectionEvent("unhandledrejection", {
      promise: Promise.resolve(),
      reason: new Error("Async failure"),
    }));
    location.hash = "settings";
    await new Promise((resolve) => setTimeout(resolve, 40));

    const captured = await storage.peek(10);
    await analytics.shutdown();
    return captured.map((event) => ({ name: event.name, properties: event.properties }));
  });

  expect(events).toEqual(expect.arrayContaining([
    expect.objectContaining({ properties: expect.objectContaining({
      trigger: "replaceState",
      path: "/app#dashboard",
    }) }),
    expect.objectContaining({ properties: expect.objectContaining({
      // Browsers may emit popstate before hashchange for direct hash updates;
      // the plugin intentionally de-duplicates the second navigation signal.
      trigger: expect.stringMatching(/^(hashchange|popstate)$/),
      path: "/app#settings",
    }) }),
    {
      name: "$unhandled_rejection",
      properties: { errorType: "Error", message: "Async failure" },
    },
  ]));
});
