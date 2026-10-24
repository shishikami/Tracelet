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

The Function fails closed until durable storage is configured. Create a
PostgreSQL database, run `migrations/001_tracelet_events.sql`, and set its
connection string:

```dotenv
POSTGRES_URL=postgresql://user:password@host/database?sslmode=require
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
- A PostgreSQL `CollectorSink` with database-enforced, cross-request `eventId` idempotency.
- A replaceable `CollectorSink` boundary when another durable database or queue is preferred.
- Optional authentication through `TRACELET_INGEST_TOKEN`.

The body limits are intentionally below Vercel Functions' platform request limit. Keep Tracelet's client-side `maxBatchBytes` below the collector's decoded limit as well.

## Durable PostgreSQL sink

The included `src/postgres-sink.ts` writes an entire EventBatch with one
multi-row statement. `event_id` is the table's primary key and
`ON CONFLICT DO NOTHING RETURNING event_id` identifies retries without a
process-local cache.

1. Provision PostgreSQL 14 or newer.
2. Apply `migrations/001_tracelet_events.sql` once with your provider's SQL
   console or migration runner.
3. Set `POSTGRES_URL` in Local, Preview and Production environments as needed.
4. Deploy the Function and send the same EventBatch twice. The first response
   reports accepted events; the second reports duplicates.

One statement is important: either PostgreSQL commits the complete batch or
the Function returns `500`, allowing the SDK to retry every event. A response
can be lost after the commit, so durable `eventId` uniqueness is a correctness
requirement—not an optimization. Do not use an in-process `Set` on Vercel
Functions; instances scale independently and can disappear.

`CollectorSink` remains a small interface. You can replace PostgreSQL with a
durable queue or another database, provided the replacement atomically accepts
the full batch and enforces the same `eventId` idempotency contract.

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

- Apply `migrations/001_tracelet_events.sql` and configure `POSTGRES_URL`.
- Choose retention and deletion rules for `tracelet_events`, then monitor table and index growth.
- Configure `TRACELET_ALLOWED_ORIGINS` for every production frontend origin.
- Decide whether ingestion is public, cookie-authenticated or uses short-lived credentials.
- Add distributed rate limits, retention rules, deletion workflows and monitoring.
- Never log event properties, authorization headers or raw request bodies by default.
- Pin the Function region near its sink and test payload limits with realistic traffic.

The starter chooses PostgreSQL only as a runnable reference sink. The browser
SDK and `CollectorSink` contract remain backend-agnostic, and the starter does
not prescribe an analytics warehouse.
