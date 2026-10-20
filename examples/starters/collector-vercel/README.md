# Tracelet Vercel Collector starter

A stateless Node.js Vercel Function that receives Tracelet JSON batches at `POST /api/events`. The request handler uses the standard Web `Request`/`Response` API, so its validation logic can be tested without starting Vercel.

## Run locally

```bash
cp .env.example .env.local
npm install
npm run check
npm run dev
```

Set `TRACELET_ALLOWED_ORIGINS` before sending events from a browser. The default empty allowlist intentionally rejects cross-origin requests; requests without an `Origin` header remain available for server-side smoke tests.

```dotenv
TRACELET_ALLOWED_ORIGINS=http://localhost:5173,https://app.example.com
```

Configure Tracelet with:

```ts
import { GzipCompression, HttpTransport, createAnalytics } from "tracelet-browser";

const analytics = createAnalytics({
  appId: "storefront",
  compression: new GzipCompression(),
  transport: new HttpTransport({
    endpoint: "https://your-project.vercel.app/api/events",
  }),
});
```

## What the starter enforces

- Explicit CORS allowlisting with a fail-closed default.
- `POST`/`OPTIONS` only, `application/json` only, and `identity` or `gzip` encoding.
- A 512 KiB compressed-body limit and a streaming 1 MiB decoded-body limit.
- EventBatch, event, timestamp, identity and request event-count validation.
- Duplicate `eventId` rejection inside one request.
- Request IDs, no-store responses, structured logs and generic internal errors.
- A replaceable `CollectorSink` boundary for durable writes and cross-request idempotency.
- Optional authentication through `TRACELET_INGEST_TOKEN`.

The body limits are intentionally below Vercel Functions' platform request limit. Keep Tracelet's client-side `maxBatchBytes` below the collector's decoded limit as well.

## Add a durable sink

`src/collector.ts` validates the request and calls `CollectorSink.write`. Replace the logging sink in `api/events.ts` with a database transaction or durable queue:

```ts
const sink: CollectorSink = {
  async write(batch, context) {
    const duplicates: string[] = [];

    for (const event of batch.events) {
      // Pseudocode: enforce a UNIQUE constraint on event.eventId.
      const inserted = await events.insertIfAbsent({
        ...event,
        receivedAt: context.receivedAt,
        requestId: context.requestId,
      });
      if (!inserted) duplicates.push(event.eventId);
    }

    return { duplicateEventIds: duplicates };
  },
};
```

Tracelet provides at-least-once client delivery. A request can be committed by the collector while the response is lost, so durable `eventId` uniqueness is a correctness requirement—not an optimization. Do not use an in-process `Set` on Vercel Functions; instances scale independently and can disappear.

## Authentication boundary

When `TRACELET_INGEST_TOKEN` is set, the example requires `Authorization: Bearer <token>`. A long-lived server token must not be embedded in public JavaScript. For browser ingestion, prefer one of these patterns:

1. Same-origin route authenticated by the application's existing secure cookie.
2. A short-lived, narrowly scoped ingestion credential minted by your backend.
3. An intentionally public ingestion endpoint protected by origin validation, schema limits, rate limiting and abuse monitoring.

Configure distributed rate limits with Vercel Firewall or a durable external store; per-instance counters are not reliable.

## Status semantics

| Status | Meaning | Tracelet behavior |
| --- | --- | --- |
| `202` | Batch committed or durably queued | Remove events from the client queue |
| `400` | Invalid JSON, EventBatch, event or header | Non-retryable; fix the producer |
| `401` | Optional authentication failed | Non-retryable; refresh or fix credentials |
| `403` | Browser origin is not allowlisted | Non-retryable; fix CORS configuration |
| `413` | Compressed or decoded body is too large | Non-retryable; lower batch size |
| `415` | Codec or content encoding is unsupported | Non-retryable; align client and collector |
| `500` | Sink did not commit the batch | Retryable; client keeps queued events |

Return `429` with `Retry-After` from a firewall or rate-limit layer when necessary. Tracelet recognizes `408`, `429` and `5xx` as retryable responses.

## Production checklist

- Replace the logging sink with durable storage or a durable queue.
- Enforce unique `eventId` values in that durable system.
- Configure `TRACELET_ALLOWED_ORIGINS` for every production frontend origin.
- Decide whether ingestion is public, cookie-authenticated or uses short-lived credentials.
- Add distributed rate limits, retention rules, deletion workflows and monitoring.
- Never log event properties, authorization headers or raw request bodies by default.
- Pin the Function region near its sink and test payload limits with realistic traffic.

The starter deliberately does not choose a database, queue or analytics warehouse. That boundary keeps the browser SDK and example collector backend-agnostic.
