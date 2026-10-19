import assert from "node:assert/strict";
import test from "node:test";

import { EventRouter, HttpTransport } from "../dist/index.js";

const batch = {
  body: "{}",
  contentType: "application/json",
  eventIds: ["event-1"],
};

test("EventRouter uses the first matching route and falls back for unmatched events", () => {
  const first = { name: "first", async send() { return { success: true }; } };
  const second = { name: "second", async send() { return { success: true }; } };
  const fallback = { name: "fallback", async send() { return { success: true }; } };
  const router = new EventRouter({
    routes: [
      { name: "first", match: (event) => event.type === "track", transport: first },
      { name: "second", match: (event) => event.name === "checkout", transport: second },
    ],
    fallback,
  });
  const baseEvent = { type: "track", name: "checkout" };

  assert.equal(router.resolve(baseEvent), first);
  assert.equal(router.resolve({ ...baseEvent, type: "page" }), second);
  assert.equal(router.resolve({ ...baseEvent, type: "identify", name: "$identify" }), fallback);
});

test("HttpTransport accepts a distinct diagnostic name", () => {
  assert.equal(new HttpTransport({ endpoint: "https://example.test", name: "primary" }).name, "primary");
  assert.equal(new HttpTransport({ endpoint: "https://example.test" }).name, "http");
});

test("treats an internal request timeout as retryable", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (_url, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
  });

  try {
    const result = await new HttpTransport({ endpoint: "https://example.test", timeoutMs: 1 })
      .send(batch, { reason: "manual" });
    assert.deepEqual(result, { success: false, retryable: true });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("treats an explicit caller abort as non-retryable", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (_url, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
  });
  const controller = new AbortController();

  try {
    const pending = new HttpTransport({ endpoint: "https://example.test", timeoutMs: 60_000 })
      .send(batch, { reason: "manual", signal: controller.signal });
    controller.abort();
    assert.deepEqual(await pending, { success: false, retryable: false });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("parses Retry-After seconds and HTTP dates, and ignores invalid values", async () => {
  const originalFetch = globalThis.fetch;
  const retryDate = new Date(Date.now() + 2_000).toUTCString();
  const responses = [
    new Response(null, { status: 429, headers: { "retry-after": "2" } }),
    new Response(null, { status: 503, headers: { "retry-after": retryDate } }),
    new Response(null, { status: 503, headers: { "retry-after": "invalid" } }),
  ];
  globalThis.fetch = async () => responses.shift();

  try {
    const transport = new HttpTransport({ endpoint: "https://example.test" });
    assert.equal((await transport.send(batch, { reason: "manual" })).retryAfterMs, 2_000);
    const dateDelay = (await transport.send(batch, { reason: "manual" })).retryAfterMs;
    assert.ok(dateDelay >= 0 && dateDelay <= 2_000);
    assert.equal((await transport.send(batch, { reason: "manual" })).retryAfterMs, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
