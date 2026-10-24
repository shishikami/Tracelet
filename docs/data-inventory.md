# Data inventory and collection boundaries

Last reviewed: 2026-10-24

This inventory describes data created by the Tracelet browser SDK itself. The
application owns every value passed in event properties, identity traits,
custom plugins, transports and headers, and must review those values under its
own privacy policy.

## Default event fields

| Field | Source | Notes |
| --- | --- | --- |
| `eventId` | SDK-generated | Random UUID when available; stable across delivery retries. |
| `type`, `name`, `timestamp`, `schemaVersion` | API call and SDK options | Callers may provide a historical event timestamp. |
| `properties` | Application or enabled plugin | Tracelet does not infer business properties from the DOM. |
| `identity.anonymousId` | SDK-generated and stored | Created only when consent permits collection. |
| `identity.sessionId` | SDK-generated and stored | Rotates after the configured inactivity timeout. |
| `identity.userId` | Explicit `identify()` call | Never inferred from cookies, DOM or account state. |
| `context.app` | `appId`, `appVersion`, `environment` options | Only `appId` is required. |
| `context.page.url` | Browser location | Origin and pathname only; query and fragment are removed. |
| `context.page.path` | Browser location | Pathname only. |
| `context.page.title` | Document title | Included when present. Titles are application-controlled and can contain sensitive text. |
| `context.page.referrer` | Document referrer | Query and fragment are removed. |
| `context.device` | Browser APIs | Language, IANA timezone and screen width/height when available. |
| `context.sdk` | Package metadata | Package name and exact SDK version. |

Tracelet does not add IP addresses, cookie values, advertising identifiers,
user-agent strings, geolocation, DOM text, form values or arbitrary `data-*`
attributes to an event. A Collector or hosting provider may independently
observe network metadata such as IP address and user agent; that server-side
processing is outside the browser SDK and must be documented separately.

## Optional autocapture

Autocapture is disabled unless `createAutoCapturePlugin()` is configured.

Page-view capture records the page name, navigation trigger, current pathname
and previous pathname. Hash fragments are excluded by default and can be
enabled only with `includeHash: true` for hash-router applications.

Error capture records a normalized error type and message. It may additionally
record a query/fragment-stripped filename, line and column. Stack traces are
excluded by default and require `includeStack: true`. Arbitrary rejected
objects are not serialized because they could contain request bodies, tokens or
user input.

## Browser persistence

| Store | Default keys/content | Lifetime |
| --- | --- | --- |
| `BrowserLocalStorage` | Prefix `et_analytics_`; anonymous ID, user ID, session ID and last activity time | Until reset, denied consent with clearing enabled, application removal, or browser eviction. |
| `IndexedDbEventStorage` | Database `et-analytics`, store `events`; complete queued events plus an internal numeric key | Until acknowledged delivery, explicit consent clearing, application removal, or browser eviction. |
| Memory fallback | The same identity or event values in process memory | Current page/process only. |

Applications can choose different database/store names and local-storage
prefixes. The SDK never reads cookies and `HttpTransport` uses
`credentials: "omit"` by default.

## Diagnostics

Diagnostics contain operational metadata such as event/attempt IDs, event
names, counts, transport/plugin names, HTTP status and retry timing. They do not
contain properties, traits, user IDs, encoded bodies, authorization headers,
raw exceptions or server response bodies.

## Application checklist

- Keep event schemas allowlisted and avoid sending secrets, credentials,
  payment data, health data or free-form user input without an explicit need.
- Decide whether document titles and error messages are appropriate for your
  product before enabling capture.
- Set initial consent to `pending` when collection requires opt-in.
- Prefer a first-party HTTPS Collector and redact or reject disallowed fields
  again on the server.
- Define retention, access and deletion rules for both queued browser data and
  accepted server data.

