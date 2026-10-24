# Public API review log

Every intentional update to `tests/fixtures/public-exports.json` or
`tests/fixtures/public-types.json` requires a dated note here. The note should
state the target version, user-visible compatibility impact, migration need and
the tests or documentation that define the behavior. Regenerate snapshots with
`pnpm api:update` only after writing the review.

## 2026-10-24 — 0.4.0 development baseline

- Added `HttpTransportOptions.keepaliveMaxBytes`; this is optional and backward
  compatible. It makes page-exit keepalive limits explicit.
- Added `event_dropped` reason `shutdown` and payload-free `plugin_error`
  diagnostics. Existing non-exhaustive consumers remain compatible; consumers
  with exhaustive unions must handle the new cases when adopting 0.4.
- Added payload-free `adapter_error` diagnostics and the `adapter-error` drop
  reason so collection and delivery adapter exceptions no longer escape routine
  instrumentation calls. Administrative privacy/inspection calls retain
  explicit failure semantics.
- Made `shutdown()` terminal and idempotent without changing its signature.
- No runtime export was added or removed. No migration is required for ordinary
  0.3 clients.
- Behavior is covered by analytics/transport tests, the API declaration gate,
  API Reference and the 0.4 changelog entry.

