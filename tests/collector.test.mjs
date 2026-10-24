import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import { after, test } from "node:test";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const buildDirectory = await mkdtemp(join(tmpdir(), "tracelet-collector-test-"));
execFileSync(process.execPath, [
  join(repositoryRoot, "node_modules/typescript/bin/tsc"),
  "-p",
  join(repositoryRoot, "examples/starters/collector-vercel/tsconfig.json"),
  "--outDir",
  buildDirectory,
], { cwd: repositoryRoot, stdio: "pipe" });

const { createTraceletCollector } = await import(
  pathToFileURL(join(buildDirectory, "src/collector.js"))
);

after(async () => {
  await rm(buildDirectory, { recursive: true, force: true });
});

const acceptedOrigin = "https://app.example.com";

function createBatch(overrides = {}) {
  return {
    protocolVersion: "1",
    sentAt: "2026-10-20T08:00:00.000Z",
    events: [
      {
        eventId: "event-1",
        type: "track",
        name: "checkout_completed",
        timestamp: "2026-10-20T07:59:59.000Z",
        identity: { anonymousId: "anon-1", sessionId: "session-1" },
        properties: { orderId: "order-1" },
        context: { app: { id: "storefront" }, sdk: { name: "tracelet-browser", version: "0.3.0-dev.0" } },
        schemaVersion: "1",
      },
    ],
    ...overrides,
  };
}

function createRequest(body, headers = {}, method = "POST") {
  return new Request("https://collector.example.com/api/events", {
    method,
    headers: {
      origin: acceptedOrigin,
      "content-type": "application/json",
      "x-analytics-event-count": "1",
      ...headers,
    },
    ...(method === "POST" ? { body } : {}),
  });
}

function silentLogger() {
  return { info() {}, error() {} };
}

test("accepts a valid batch and reports sink-level duplicates", async () => {
  const writes = [];
  const handle = createTraceletCollector({
    allowedOrigins: [acceptedOrigin],
    logger: silentLogger(),
    sink: {
      async write(batch, context) {
        writes.push({ batch, context });
        return { duplicateEventIds: ["event-1"] };
      },
    },
  });

  const response = await handle(createRequest(JSON.stringify(createBatch()), { "x-request-id": "request-1" }));

  assert.equal(response.status, 202);
  assert.equal(response.headers.get("access-control-allow-origin"), acceptedOrigin);
  assert.equal(response.headers.get("x-tracelet-request-id"), "request-1");
  assert.deepEqual(await response.json(), {
    requestId: "request-1",
    accepted: 0,
    duplicates: 1,
    eventIds: [],
  });
  assert.equal(writes.length, 1);
  assert.equal(writes[0].batch.events[0].name, "checkout_completed");
});

test("handles CORS preflight and rejects origins outside the allowlist", async () => {
  const handle = createTraceletCollector({
    allowedOrigins: [acceptedOrigin],
    logger: silentLogger(),
    sink: { write() {} },
  });

  const preflight = await handle(createRequest(undefined, {
    "access-control-request-method": "POST",
  }, "OPTIONS"));
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), acceptedOrigin);

  const denied = await handle(new Request("https://collector.example.com/api/events", {
    method: "POST",
    headers: { origin: "https://attacker.example", "content-type": "application/json" },
    body: JSON.stringify(createBatch()),
  }));
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get("access-control-allow-origin"), null);
  assert.equal((await denied.json()).error, "origin_not_allowed");
});

test("decodes gzip without changing the validated EventBatch contract", async () => {
  let captured;
  const handle = createTraceletCollector({
    allowedOrigins: [acceptedOrigin],
    logger: silentLogger(),
    sink: { write(batch) { captured = batch; } },
  });
  const body = gzipSync(JSON.stringify(createBatch()));

  const response = await handle(createRequest(body, { "content-encoding": "gzip" }));

  assert.equal(response.status, 202);
  assert.equal(captured.events[0].eventId, "event-1");
});

test("rejects decompression expansion beyond the decoded byte limit", async () => {
  const handle = createTraceletCollector({
    allowedOrigins: [acceptedOrigin],
    maxDecodedBytes: 100,
    logger: silentLogger(),
    sink: { write() { assert.fail("oversized batches must not reach the sink"); } },
  });

  const response = await handle(createRequest(
    gzipSync(JSON.stringify(createBatch())),
    { "content-encoding": "gzip" },
  ));

  assert.equal(response.status, 413);
  assert.equal((await response.json()).error, "payload_too_large");
});

test("rejects a request beyond the compressed byte limit before calling the sink", async () => {
  const handle = createTraceletCollector({
    allowedOrigins: [acceptedOrigin],
    maxCompressedBytes: 32,
    logger: silentLogger(),
    sink: { write() { assert.fail("oversized request bodies must not reach the sink"); } },
  });

  const response = await handle(createRequest(JSON.stringify(createBatch())));

  assert.equal(response.status, 413);
  assert.equal((await response.json()).error, "payload_too_large");
});

test("rejects duplicate IDs and mismatched declared event counts", async () => {
  const handle = createTraceletCollector({
    allowedOrigins: [acceptedOrigin],
    logger: silentLogger(),
    sink: { write() {} },
  });
  const first = createBatch().events[0];
  const duplicateBatch = createBatch({ events: [first, { ...first }] });

  const duplicate = await handle(createRequest(
    JSON.stringify(duplicateBatch),
    { "x-analytics-event-count": "2" },
  ));
  assert.equal(duplicate.status, 400);
  assert.equal((await duplicate.json()).error, "invalid_event");

  const mismatch = await handle(createRequest(
    JSON.stringify(createBatch()),
    { "x-analytics-event-count": "2" },
  ));
  assert.equal(mismatch.status, 400);
  assert.equal((await mismatch.json()).error, "event_count_mismatch");
});

test("rejects unsupported protocol versions before writing to the sink", async () => {
  const handle = createTraceletCollector({
    allowedOrigins: [acceptedOrigin],
    logger: silentLogger(),
    sink: { write() { assert.fail("unsupported protocol versions must not reach the sink"); } },
  });

  const response = await handle(createRequest(JSON.stringify(createBatch({ protocolVersion: "2" }))));

  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "unsupported_protocol_version");
});

test("supports optional authentication without exposing the expected credential", async () => {
  const handle = createTraceletCollector({
    allowedOrigins: [acceptedOrigin],
    authorize(request) {
      return request.headers.get("authorization") === "Bearer server-secret";
    },
    logger: silentLogger(),
    sink: { write() {} },
  });

  const denied = await handle(createRequest(JSON.stringify(createBatch())));
  assert.equal(denied.status, 401);
  assert.equal(denied.headers.get("www-authenticate"), "Bearer");
  assert.equal((await denied.json()).error, "unauthorized");

  const accepted = await handle(createRequest(
    JSON.stringify(createBatch()),
    { authorization: "Bearer server-secret" },
  ));
  assert.equal(accepted.status, 202);
});

test("returns a generic retryable server error when the durable sink fails", async () => {
  const errors = [];
  const handle = createTraceletCollector({
    allowedOrigins: [acceptedOrigin],
    logger: { info() {}, error(message) { errors.push(message); } },
    sink: { write() { throw new Error("database password must stay private"); } },
  });

  const response = await handle(createRequest(JSON.stringify(createBatch())));
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.equal(body.error, "collector_failure");
  assert.doesNotMatch(JSON.stringify(body), /database password/);
  assert.equal(errors.length, 1);
});
