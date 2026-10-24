# Failure semantics

Last reviewed: 2026-10-24

Tracelet separates routine analytics failures from administrative operations
where hiding a failure could create a false privacy or observability guarantee.

## Collection and delivery

- `track()`, `page()` and `identify()` resolve when a runtime identity or event
  storage adapter fails. The event is dropped and payload-free
  `adapter_error` plus `event_dropped` diagnostics are emitted.
- Plugin `beforeTrack`, `afterTrack` and `teardown` failures are isolated and
  reported as `plugin_error`. A `beforeTrack` failure drops that event.
- Codec, compression, transport and delivery-lock exceptions do not reject
  `flush()`. The queue is retained, `adapter_error` and retry diagnostics are
  emitted, and normal retry scheduling applies.
- A non-retryable transport result is not an exception: its events are removed
  under the transport contract and `flush_failed` reports `retryable: false`.
- Plugin `setup` is intentionally different. `init()` rejects, already-started
  plugins are torn down, and the client is not reported as initialized.

Diagnostics identify an adapter and operation but never include raw errors,
event properties, user IDs, encoded bodies or headers.

## Administrative and inspection calls

The following calls may surface adapter exceptions because pretending they
succeeded would be misleading:

- `setConsent("denied")` when configured queue or identity clearing fails;
- `reset()` when a custom identity store fails;
- `getQueueSnapshot()` or `getStorageEstimate()` when a custom event store
  cannot be read;
- direct calls to custom adapters outside the `Analytics` client.

The built-in `BrowserLocalStorage` catches browser storage access failures and
falls back to memory. `createBrowserEventStorage()` chooses its configured
fallback when IndexedDB cannot be opened during startup.

Applications should observe diagnostics for operational health and explicitly
handle consent-erasure failures. Analytics delivery remains best effort and
must never be used as the sole record for payments, medical decisions, audit
logs or other transactional data.

