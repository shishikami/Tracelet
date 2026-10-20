# RFC 0001: Tracelet 0.3 observability API

- Status: Proposed
- Target: `0.3.0`
- Last updated: 2026-10-20
- Scope: browser SDK public API; no collector-specific dependency

## Summary

Tracelet already emits diagnostic events through the constructor-only `onDiagnostic` callback, but an application cannot query the current queue/delivery state or add observers after creating the client. Version 0.3 should add a read-only snapshot API and lifecycle subscriptions while keeping storage, codecs, transports and collectors replaceable.

This RFC is a design proposal, not a promise that every field will ship unchanged. The API should be implemented only after the acceptance tests below are agreed upon.

## Problem

Applications need to answer operational questions without reading Tracelet internals:

- Are events waiting locally, and what is the oldest event timestamp?
- Is a flush idle, sending, or waiting for a retry?
- Which delivery attempt failed, and when will the next attempt occur?
- Can a debug panel or framework adapter attach and detach without rebuilding the client?
- Can this be observed without turning diagnostics into product analytics events?

The current callback reports individual transitions, but consumers must install it during construction and reconstruct state themselves. Reading the configured `EventStorage` directly leaks implementation details and can race with delivery.

## Goals

1. Expose a best-effort, immutable snapshot of queue and delivery state.
2. Allow multiple diagnostic subscribers with an idempotent unsubscribe function.
3. Correlate `flush_started`, success and failure for one network attempt.
4. Preserve the existing `onDiagnostic` option and all current diagnostic event names.
5. Avoid event properties, encoded payloads, user IDs and transport credentials in diagnostics.
6. Keep the API useful with both built-in and custom `EventStorage` implementations.

## Non-goals

- Exact byte accounting for every custom storage implementation.
- A promise that the browser queue equals server-side ingestion state.
- A reactive framework store, UI component or remote monitoring backend.
- Mutation methods that reorder, edit or manually delete individual queued events.
- Delivery exactly once. Collector idempotency by `eventId` remains required.

## Proposed API

```ts
export type DeliveryPhase = "idle" | "sending" | "waiting-retry";

export interface QueueSnapshot {
  /** Number of events visible to the configured EventStorage at read time. */
  pendingEvents: number;
  /** Event timestamp, not a guaranteed persistence/enqueue timestamp. */
  oldestEventTimestamp?: string;
  /** Origin-wide advisory values when the storage adapter can provide them. */
  storageEstimate?: StorageEstimate;
  delivery: {
    phase: DeliveryPhase;
    retryAttempt: number;
    nextRetryAt?: string;
    activeAttemptId?: string;
    transport?: string;
  };
}

export type DiagnosticListener = (event: DiagnosticEvent) => void;

export class Analytics<TEvents extends object = Record<string, EventProperties>> {
  getQueueSnapshot(): Promise<QueueSnapshot>;
  subscribeDiagnostics(listener: DiagnosticListener): () => void;
}
```

Example:

```ts
const unsubscribe = analytics.subscribeDiagnostics((event) => {
  if (event.type === "flush_failed") {
    console.warn("Tracelet delivery failed", {
      attemptId: event.attemptId,
      retryable: event.retryable,
      status: event.status,
    });
  }
});

const snapshot = await analytics.getQueueSnapshot();
console.log(snapshot.pendingEvents, snapshot.delivery.phase);

unsubscribe();
```

### Diagnostic event additions

Existing event names remain. Delivery events gain correlation fields:

```ts
type DeliveryDiagnosticEvent =
  | {
      type: "flush_started";
      attemptId: string;
      eventCount: number;
      reason: TransportContext["reason"];
      transport: string;
    }
  | {
      type: "flush_succeeded";
      attemptId: string;
      eventCount: number;
      transport: string;
      status?: number;
    }
  | {
      type: "flush_failed";
      attemptId: string;
      eventCount: number;
      retryable: boolean;
      transport?: string;
      status?: number;
    }
  | {
      type: "flush_retry_scheduled";
      attemptId: string;
      attempt: number;
      delayMs: number;
      nextRetryAt: string;
    };
```

`attemptId` identifies one call to `Transport.send`; it is not a server acknowledgement ID and is not stable across retries. Event IDs remain stable and are the collector's idempotency keys.

## Semantics

### Snapshot consistency

`getQueueSnapshot()` is observational, not transactional. It may call `size()`, `peek(1)` and optional `estimate()` at slightly different times. The returned object describes a recent state and must not be used for billing, deletion guarantees or server reconciliation.

`oldestEventTimestamp` is explicitly the event's `timestamp`. Callers may provide a historical timestamp through `TrackOptions`, so it must not be labeled “time in queue.” A true enqueue duration would require persisted queue metadata and a storage migration; that is deferred.

### Delivery phases

- `idle`: no `Transport.send` call is active and no retry timer is currently scheduled.
- `sending`: a selected batch is being encoded, compressed or sent.
- `waiting-retry`: a retryable failure scheduled the next flush.

Calling `flush()` while another flush is active remains coalesced. The snapshot exposes the active attempt but does not create a second one.

### Subscriptions

- Listeners run synchronously in registration order after internal state changes.
- Listener errors are isolated and never affect collection or delivery.
- `subscribeDiagnostics` does not replay past events. Call `getQueueSnapshot()` for initial state.
- Calling the returned unsubscribe function more than once is safe.
- The constructor's `onDiagnostic` callback behaves like the first permanent listener for backward compatibility.

### Privacy

Diagnostics may contain random event/attempt identifiers, counts, transport names, response status and retry timing. They must not contain event properties, encoded bodies, identity traits, user IDs, authorization headers, full URLs with query strings, or server response bodies.

## Internal design

The client should own a private `Set<DiagnosticListener>` and a small delivery-state record. `emit()` first updates internal state, then invokes a stable snapshot of listeners so a listener can safely unsubscribe itself.

No new method is required on `EventStorage` for the initial version:

- `size()` provides `pendingEvents`.
- `peek(1)` provides the oldest event timestamp.
- optional `estimate()` provides origin-wide storage health.

Exact queue bytes and persistence time remain absent until a storage-neutral contract can be designed without scanning and re-encoding the entire queue.

## Compatibility and migration

- Existing `createAnalytics(options)` calls continue compiling unchanged.
- Existing `onDiagnostic` handlers continue receiving the same event names; added object properties are backward compatible for structural TypeScript consumers.
- Exhaustive `switch` statements remain valid because no event name is removed.
- Custom storage and transport implementations require no new method.
- The public export snapshot and npm package smoke test must be updated when the API is implemented.

## Acceptance tests

Implementation is complete only when automated tests prove:

1. A fresh client reports zero pending events and `idle`.
2. Enqueueing changes the snapshot without emitting a product event.
3. A sending transport exposes `sending` and one `activeAttemptId`.
4. Success returns to `idle` and removes committed events.
5. A retryable failure exposes `waiting-retry`, retry count and `nextRetryAt`.
6. A non-retryable response returns to `idle` and removes rejected events under current semantics.
7. Concurrent `flush()` calls share one attempt.
8. Multiple listeners receive events in order; one throwing listener cannot break delivery.
9. Unsubscribe is idempotent and stops future events.
10. Snapshot reads work with built-in memory/IndexedDB storage and a minimal custom storage.
11. Diagnostics never expose properties, identities, encoded bodies or headers.
12. Chromium, Firefox and WebKit pass the snapshot/subscription lifecycle tests.

## Open questions before implementation

1. Should `pendingEvents` be named `queuedEvents` for consistency with documentation?
2. Should the last success/failure be retained in the snapshot, or remain event-only?
3. Is an `AsyncIterable<DiagnosticEvent>` worth adding later, or would it duplicate subscriptions?
4. Should a future storage contract expose exact queue bytes and persisted enqueue timestamps?

## Rollout

1. Resolve the naming questions in a public design Issue or Discussion.
2. Implement state tracking without changing delivery behavior.
3. Add unit and three-browser tests before updating the API reference.
4. Publish `0.3.0-beta.1` and validate the API in the Playground/debug panel.
5. Stabilize names for `0.3.0`; breaking adjustments after that wait for a major version.
