# Tracelet EventBatch protocol v1

Status: stable for the `0.4.0` contract-hardening cycle  
Last reviewed: 2026-10-24

This document defines the wire contract between `tracelet-browser` and a
collector. It is intentionally independent from any database, queue, hosting
provider or analytics warehouse.

## Request

The client sends one `EventBatch` with `POST`. JSON uses
`Content-Type: application/json`; a caller-supplied Protobuf encoder uses
`application/x-protobuf`. `Content-Encoding` is absent for identity encoding or
is `gzip` when `GzipCompression` is configured.

The optional `x-analytics-event-count` header must equal `events.length`. It is
a diagnostic and request-validation hint, not an authorization mechanism.

```ts
interface EventBatchV1 {
  protocolVersion: "1";
  sentAt: string; // ISO-8601 timestamp for this delivery attempt
  events: Array<{
    eventId: string; // Stable across retries; collector idempotency key
    type: "track" | "page" | "identify" | "group";
    name: string;
    timestamp: string; // ISO-8601 event occurrence time
    identity: {
      anonymousId: string;
      sessionId: string;
      userId?: string;
    };
    properties: Record<string, unknown>;
    context: Record<string, unknown>;
    schemaVersion: string;
  }>;
}
```

The current browser client emits `track`, `page` and `identify`. `group` is
reserved in protocol v1 for compatible clients; applications must not infer
that the current `Analytics` class exposes a `group()` method.

## Validation and compatibility

- A collector must reject an unsupported `protocolVersion` with a non-`2xx`
  response. The Vercel starter accepts only `"1"` by default.
- Fields listed above are required except `identity.userId`.
- Collectors should ignore unknown fields within protocol v1 so optional data
  can be added without breaking older collectors.
- Removing a required field, changing its meaning or changing an existing field
  type requires a new protocol version.
- `schemaVersion` belongs to the application's event catalogue. It can evolve
  independently from the EventBatch protocol.
- Protobuf field numbers in `proto/analytics.proto` are permanent. Removed
  fields must be reserved rather than reused.

## Success and acknowledgement

Any HTTP `2xx` response is a **complete batch acknowledgement**. Before sending
it, the collector must have durably accepted every event or recognized it as an
already committed duplicate. The browser SDK removes the complete batch after
any `2xx` and does not parse a partial acknowledgement body.

Consequently, a collector must not return `2xx` after committing only part of a
batch. If it cannot atomically accept the complete batch, it must return a
retryable failure and rely on `eventId` idempotency when the client retries.

The Vercel starter returns `202` with request diagnostics, accepted counts and
duplicate counts. These response fields help operators but do not change the
complete-batch acknowledgement rule.

## Retry contract

| Response | Client behavior |
| --- | --- |
| Any `2xx` | Remove the complete acknowledged batch. |
| `408`, `429`, any `5xx` | Retain the batch and retry. Honor a valid `Retry-After`. |
| Other `4xx` | Treat as non-retryable and remove the rejected batch. |
| Network, DNS, TLS, CSP or timeout failure | Retain the batch and retry. |
| Explicit caller abort | Do not retry that send automatically. |

Collectors should use `400`/`415`/`422` only for payloads that will remain
invalid if retried unchanged. Authentication systems that can recover after a
credential refresh should coordinate that behavior with a custom `Transport`;
the built-in HTTP transport treats ordinary `401` and `403` as non-retryable.

## Idempotency and ordering

- `eventId` is the durable idempotency key. A production sink must enforce a
  database- or queue-level unique constraint on it.
- Retries reuse the same `eventId` values but generate a new `sentAt` value.
- Events within one storage queue are selected FIFO. Consumers must not depend
  on global ordering across tabs, applications or routed collectors.
- Tracelet provides at-least-once delivery attempts. Exactly-once persistence
  requires the collector's durable unique constraint.

## Size and lifecycle boundaries

The SDK limits individual events and encoded batches before transport. A
collector must independently enforce compressed and decoded request limits.

During `pagehide` and `shutdown`, `HttpTransport` enables Fetch `keepalive` only
when the encoded body is within its keepalive budget. A larger body uses a
regular retryable Fetch request. Applications requiring stronger page-exit
delivery should use smaller batches and retain IndexedDB persistence rather
than treating page-exit delivery as guaranteed.

## Privacy and security

- Browser credentials default to `omit`.
- Query strings and URL fragments are excluded from default page context.
- Long-lived server secrets must never be embedded in browser headers.
- Collectors must validate origins, authorization, media type, content
  encoding, compressed size, decoded size, event count and duplicate IDs.
- Logs should contain request IDs, counts and status, not event properties,
  identities, authorization headers or raw request bodies.

## Conformance evidence

- SDK transport behavior: `tests/transport.test.mjs`
- Queue and retry behavior: `tests/analytics.test.mjs`
- JSON/gzip collector contract: `tests/collector.test.mjs`
- PostgreSQL atomic persistence and restart-safe idempotency:
  `examples/starters/collector-vercel/src/postgres-sink.ts` and the PostgreSQL
  CI service test in `tests/collector.test.mjs`
- Real browser delivery: `tests/browser/sdk.spec.ts`
- Repeated-reload soak, ephemeral contexts, cookie-free cross-origin delivery
  and client-blocker recovery: `tests/browser/resilience.spec.ts`
- Protobuf field layout: `proto/analytics.proto`
