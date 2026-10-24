# Browser support policy

Last reviewed: 2026-10-24

Tracelet is a browser-first, native-ESM package. A browser is **CI verified**
only when the repository's complete Playwright suite passes against that exact
engine. Environments outside the table may work when they provide the required
capabilities, but they are not part of the automated support claim.

## Currently verified engines

| Engine | CI runtime | Typical browser family | Evidence |
| --- | --- | --- | --- |
| Chromium | 156.0.8078.4 | Chrome, Edge and other Chromium browsers | `tests/browser/sdk.spec.ts` |
| Firefox | 157.0 | Firefox | `tests/browser/sdk.spec.ts` |
| WebKit | 27.2 | Safari-family engine behavior | `tests/browser/sdk.spec.ts` |

These are the engines bundled with `@playwright/test@1.64.1`, which is pinned
in `package.json`. Updating Playwright changes the tested browser line and must
update this page and the compatibility matrix in the same pull request.

The table is an exact test statement, not a promise that only those versions
work. Tracelet does not yet claim a historical minimum Chrome, Edge, Firefox or
Safari version. Establishing and continuously testing those minimums is a 1.0
release gate.

## Required and optional capabilities

| Capability | Requirement | Behavior when unavailable |
| --- | --- | --- |
| Native ES modules / ES2022 | Required by the published package | Transpile in the application build or use a supported modern browser. Tracelet does not publish CommonJS or IIFE builds. |
| Fetch, `AbortController`, `Blob`, `TextEncoder` | Required by `HttpTransport` | Supply a custom `Transport` or application-level polyfill before creating the client. |
| Promise, URL, Web Crypto `randomUUID` | Promise and URL required; `randomUUID` optional | IDs fall back to a local time/random implementation when `randomUUID` is absent. |
| IndexedDB | Optional | `createBrowserEventStorage()` selects the configured fallback, memory by default, and reports it through `onFallback`. |
| Web Locks API | Optional | `BrowserDeliveryLock` safely degrades to an in-process lock; cross-tab duplicate sends remain possible and the Collector must deduplicate by `eventId`. |
| `CompressionStream` | Optional | Use `NoCompression`, or explicitly configure another `Compression` adapter. |
| StorageManager estimate/persisted APIs | Optional | Storage estimates omit unavailable fields or return `undefined`. Collection continues. |
| Page Visibility and `pagehide` | Optional lifecycle enhancement | Periodic and manual flush still work; no page-exit guarantee is claimed. |

## Mobile, embedded and constrained browsers

- Mobile Chrome and Android WebView are not separately automated; Chromium
  engine coverage is useful evidence but not a device support claim.
- Mobile Safari and `WKWebView` are not separately automated; WebKit coverage
  does not reproduce iOS storage eviction and backgrounding policy exactly.
- Private/ephemeral browsing, strict enterprise policies and privacy extensions
  can reduce storage or network availability. The SDK is designed to fall back
  or retry, but those modes remain explicitly listed in the compatibility
  matrix until dedicated fixtures exist.
- A CSP must allow the configured collector in `connect-src`. Tracelet does not
  use `eval` and does not require inline scripts.

## Support changes

A browser support change requires all of the following:

1. an automated test or a repeatable manual fixture for the exact environment;
2. an update to this policy and `compatibility-matrix.md`;
3. an entry in the changelog when user-visible behavior changes;
4. a major release if a previously committed 1.x minimum is raised outside the
   documented support window.

