# Tracelet compatibility and resilience matrix

Last reviewed: 2026-10-24

This matrix distinguishes what CI proves today from documented manual checks and planned coverage. “Supported” means the named path has automated evidence in this repository; it does not imply support for every historical browser or third-party extension.

Exact tested engine versions, required capabilities and fallback behavior are
defined in the [browser support policy](./browser-support.md).

## Status legend

| Status | Meaning |
| --- | --- |
| ✅ Automated | Runs in CI and blocks merging on failure. |
| 🧪 Manual | A repeatable check is documented but not yet a CI gate. |
| ⚠️ Partial | A related path is automated, but an important variant is missing. |
| 🗓️ Planned | Targeted for the 0.4 contract-hardening cycle; not currently claimed as verified. |
| ➖ Deferred | Explicitly outside the 0.3 supported surface. |

## Browser and lifecycle

| Capability | Chromium | Firefox | WebKit | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| Package import and real HTTP delivery | Yes | Yes | Yes | `tests/browser/sdk.spec.ts`: real collector | ✅ Automated |
| IndexedDB persistent queue | Yes | Yes | Yes | Real collector test uses `IndexedDbEventStorage` | ✅ Automated |
| `pagehide` flush | Yes | Yes | Yes | Browser lifecycle test | ✅ Automated |
| Hidden-page `visibilitychange` flush | Yes | Yes | Yes | Isolated browser lifecycle test with real HTTP delivery | ✅ Automated |
| gzip through `CompressionStream` | Yes | Yes | Yes | Browser gzip delivery test | ✅ Automated |
| Retry after transient `503` | Yes | Yes | Yes | Browser recovery test | ✅ Automated |
| Multiple collector routing | Yes | Yes | Yes | Browser routing test | ✅ Automated |
| Cross-tab delivery lock | Yes | Yes | Yes | Two real pages share IndexedDB and flush concurrently without duplicates | ✅ Automated |
| Storage quota diagnostics | Unit only | Unit only | Unit only | Synthetic quota rejection test | ⚠️ Partial |
| Queue snapshots and runtime diagnostic subscriptions | Yes | Yes | Yes | Real IndexedDB observability lifecycle test | ✅ Automated |
| Private/ephemeral browsing modes | — | — | — | Browser policies vary by version | 🗓️ Planned |

## Network and collector behavior

| Scenario | Expected behavior | Evidence | Status |
| --- | --- | --- | --- |
| Any `2xx` response | Remove committed events | Unit and browser delivery tests | ✅ Automated |
| `408`, `429`, `5xx` | Keep events and retry | Transport/analytics tests; browser `503` test | ✅ Automated |
| `Retry-After` seconds or HTTP date | Schedule the requested delay | `tests/transport.test.mjs` | ✅ Automated |
| Request timeout | Keep events and retry | `tests/transport.test.mjs` | ✅ Automated |
| Page-exit keepalive budget | Use keepalive only for bodies within the configured safety budget | `tests/transport.test.mjs` | ✅ Automated |
| Explicit caller abort | Do not retry that send | `tests/transport.test.mjs` | ✅ Automated |
| JSON + gzip ingestion | Decode and validate the same EventBatch | `tests/collector.test.mjs` | ✅ Automated |
| CORS preflight and origin allowlist | Allow configured origins; deny others | `tests/collector.test.mjs` | ✅ Automated |
| Compressed/decoded body limits | Reject with `413` before the sink | `tests/collector.test.mjs` | ✅ Automated |
| Within-batch duplicate IDs | Reject with `400` | `tests/collector.test.mjs` | ✅ Automated |
| Unsupported protocol version | Reject before the Sink is called | `tests/collector.test.mjs` and `docs/protocol-v1.md` | ✅ Automated |
| Delivery attempt correlation | Start, result and retry schedule share `attemptId` | Unit and three-browser observability tests | ✅ Automated |
| Cross-request idempotency | Durable sink enforces unique `eventId` | Sink contract and starter documentation; no database chosen | 🧪 Manual |
| Offline → online browser transition | IndexedDB retains the event and retry succeeds after reconnecting | Playwright context network transition in all three browsers | ✅ Automated |
| Captive portal / DNS / TLS failure | Keep events and retry | Fetch failure is covered generically, not browser-network variants | ⚠️ Partial |

## Privacy, policy and constrained environments

| Scenario | Current behavior | Evidence | Status |
| --- | --- | --- | --- |
| Consent denied | Drop before identity/event persistence | Unit tests and public contract | ✅ Automated |
| URL query/fragment sanitization | Omit query and fragment from default context | Browser context sanitization test | ✅ Automated |
| `localStorage` unavailable/throws | Fall back to in-memory identity storage | Unit tests | ✅ Automated |
| IndexedDB unavailable | `createBrowserEventStorage()` selects an explicit fallback before client creation | Unit fallback test plus persistent selection in all three browsers | ✅ Automated |
| Storage quota exceeded | Drop current event safely and emit diagnostics | Unit test | ✅ Automated |
| CSP `connect-src` blocks collector | Fetch fails and queue is retained | Response-header CSP fixture in all three browsers | ✅ Automated |
| Strict CSP blocks inline/eval | SDK uses ESM without eval; website policy fixture missing | Source inspection only | 🗓️ Planned |
| Common privacy/ad blockers | Endpoint-dependent; custom first-party paths recommended | No maintained extension corpus | 🗓️ Planned |
| Third-party cookies disabled | Default transport uses `credentials: "omit"`; no dedicated browser-policy fixture | Source contract and manual inspection | ⚠️ Partial |

## Package, runtime and framework integration

| Target | What is checked | Evidence | Status |
| --- | --- | --- | --- |
| Node.js 20 | Types, unit tests, package install/import, Vite build, docs build | CI quality matrix | ✅ Automated |
| Node.js 24 | Same as Node 20 | CI quality matrix | ✅ Automated |
| Native ESM consumer | Root export resolves from packed tarball | `scripts/package-smoke.mjs` | ✅ Automated |
| TypeScript declarations | Typed consumer compiles from packed tarball | `scripts/package-smoke.mjs` | ✅ Automated |
| Vite application | Installed tarball bundles in a minimal app | `scripts/package-smoke.mjs` | ✅ Automated |
| React + Vite starter | Installs current tarball and completes a production build | `scripts/ecosystem-smoke.mjs` | ✅ Automated |
| Vue + Vite starter | Installs current tarball, type-checks SFCs and completes a production build | `scripts/ecosystem-smoke.mjs` | ✅ Automated |
| Next.js client boundary | Standalone App Router starter installs current tarball and completes a Turbopack production build | `examples/starters/nextjs`; ecosystem smoke test | ✅ Automated |
| Webpack/Rollup direct consumers | Both resolve and bundle the installed current tarball | `scripts/ecosystem-smoke.mjs` | ✅ Automated |
| CDN/IIFE `<script>` usage | 0.3 remains native ESM-only; revisit on demonstrated demand | `docs/rfcs/0002-distribution-formats.md` | ➖ Deferred |
| Vercel Function collector | Handler compiles and protocol tests run on Node 20/24 | `tests/collector.test.mjs` | ✅ Automated |

## 0.3 implementation order

### P0 — make current claims explicit

- Keep this matrix linked from README and contribution guidance.
- Run collector contract tests in the existing Node 20/24 CI matrix.
- Treat partial/planned rows as limitations, not implicit support claims.

### P1 — resilience fixtures (completed)

- [x] Add a browser test that starts offline, enqueues, returns online and succeeds.
- [x] Serve a CSP-constrained fixture and verify `connect-src` failure retains the queue.
- [x] Add a real multi-page test for the shared IndexedDB delivery lock.
- [x] Add an isolated `visibilitychange` lifecycle assertion.

### P2 — ecosystem builds (completed)

- [x] Build the React and Vue starters in CI, not only type-check shared adapters.
- [x] Add minimal Rollup and Webpack consumers that install the packed tarball.
- [x] Add a Next.js production-build fixture around the documented client boundary.
- [x] Evaluate CDN/IIFE scope and keep 0.3 ESM-only until demonstrated demand.

## How to update this matrix

A row can move to ✅ only when the linked test executes the exact target and behavior in CI. A unit test may justify “Unit only” but must not be promoted to three-browser support. When support changes, update the matrix, public documentation and changelog together.
