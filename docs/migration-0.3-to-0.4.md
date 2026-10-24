# Migrate from Tracelet 0.3 to 0.4

Last reviewed: 2026-10-24

Tracelet 0.4 is a contract-hardening release. It does not remove a runtime
export or require a new Collector architecture, but it makes shutdown, adapter
failures, protocol versions and page-exit delivery more explicit.

> `0.4.0` is still in development. Do not change production dependencies until
> a beta or stable version appears on npm. During the beta, use an exact version
> or the `beta` tag rather than a floating pre-release range.

## Upgrade

When the beta is published:

```bash
npm install tracelet-browser@beta
# or, after the stable release
npm install tracelet-browser@^0.4.0
```

Run the application's type check, production bundle and browser integration
tests. Because the package is below 1.0, a minor version may intentionally add
new union members even when ordinary method calls remain source-compatible.

## Changes to review

### `shutdown()` is terminal

`shutdown()` is now idempotent, waits for the active/final flush and tears down
initialized plugins once in reverse order. Calling `track()`, `page()` or
`identify()` afterward safely drops the event with reason `shutdown`; calling
`init()` does not restart the client.

Create a new Analytics instance when a permanently unmounted micro-frontend is
mounted again. Do not reuse a shut-down singleton.

### Diagnostic unions gained cases

Handle the new payload-free diagnostics when code uses an exhaustive switch:

```ts
analytics.subscribeDiagnostics((event) => {
  switch (event.type) {
    case "plugin_error":
      console.warn("Tracelet plugin failed", event.plugin, event.stage);
      break;
    case "adapter_error":
      console.warn("Tracelet adapter failed", event.adapter, event.operation);
      break;
    case "event_dropped":
      // New reasons include shutdown and adapter-error.
      console.warn("Tracelet dropped an event", event.eventName, event.reason);
      break;
    default:
      break;
  }
});
```

Raw exceptions and payloads are intentionally absent. Codec, compression,
transport and delivery-lock exceptions retain the queue and schedule a retry.
Routine identity/event-storage failures drop the current event without rejecting
the product instrumentation call. Consent erasure and explicit inspection calls
can still reject; see `failure-semantics.md`.

### Page-exit keepalive has a byte budget

`HttpTransport` uses Fetch `keepalive` for `page-hide` and `shutdown` only when
the encoded body fits `keepaliveMaxBytes` (60 KiB by default). Larger payloads
use a regular retryable Fetch request.

```ts
const transport = new HttpTransport({
  endpoint: "/api/analytics",
  keepaliveMaxBytes: 60 * 1024,
});
```

Most applications should keep the default. A lower value can accommodate other
keepalive traffic from the same page; raising it does not override browser
quotas.

### EventBatch v1 is enforced by the Collector starter

The Vercel Collector starter now rejects unsupported `protocolVersion` values
with `400 unsupported_protocol_version`. If the application already emits the
default version `"1"`, no change is required. Custom clients and collectors
should implement the compatibility and whole-batch acknowledgement rules in
`protocol-v1.md`.

### Plugin failures are isolated

`beforeTrack`, `afterTrack` and `teardown` errors emit `plugin_error` instead of
escaping into product code. `setup` failure remains explicit: `init()` rejects
and already initialized plugins are rolled back. Test setup failures where an
application calls `init()` manually.

## No change required

- The package remains native ESM and is still installed as `tracelet-browser`.
- `createAnalytics()`, event maps, `track()`, `page()`, `identify()`, Consent,
  IndexedDB storage and EventRouter retain their existing signatures.
- EventBatch `group` remains a reserved protocol type; no `Analytics.group()`
  method is added in 0.4.
- The website remains outside the npm `files` allowlist and does not affect the
  installed SDK size.

## Verification checklist

- [ ] Type check all exhaustive `DiagnosticEvent` handling.
- [ ] Confirm post-unmount code does not reuse a shut-down client.
- [ ] Send a real EventBatch v1 through the deployed Collector.
- [ ] Simulate a retryable response and verify the queue is retained.
- [ ] Test Consent denial and confirm queue/identity clearing succeeds.
- [ ] Review event fields against `data-inventory.md`.

