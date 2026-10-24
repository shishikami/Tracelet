# Browser SDK threat model

Last reviewed: 2026-10-24

This is a concise threat model for the Tracelet SDK and its EventBatch v1
boundary. It is not a security audit of an application or Collector deployment.

## Assets and trust boundaries

The protected assets are event properties, identity fields, queued events,
Collector credentials, delivery integrity and user consent state.

Trust boundaries exist between:

1. application code and Tracelet's public API;
2. first-party code and custom plugins/adapters;
3. the browser origin and its local storage;
4. the browser and the HTTPS Collector;
5. the Collector and its durable data store.

Code executing in the same origin already has substantial access to browser
APIs. Tracelet cannot protect queued data from a fully compromised first-party
page, malicious extension or cross-site scripting payload running with that
origin's privileges.

## Threats and mitigations

| Threat | Current mitigation | Remaining responsibility |
| --- | --- | --- |
| Collection before consent | Consent is checked before identity creation and event persistence. Denial can clear queue and identity. | Application must configure the legally appropriate initial state and consent UI. |
| Sensitive values leak through URLs | Default URL/referrer context removes query and fragment; hash autocapture is opt-in. | Do not place secrets in pathnames or event properties. |
| DOM or form surveillance | Built-in autocapture never scans DOM text, values or `data-*` attributes. | Review all custom plugins. |
| Error payload leakage | Stack capture is off by default; arbitrary rejection objects are not serialized. | Error messages, filenames and opted-in stacks still require review. |
| Duplicate delivery | Stable `eventId`, FIFO queue and best-effort cross-tab lock. | Durable Collector sink must enforce a unique `eventId` constraint. |
| Event loss during retries or reload | IndexedDB queue, retry backoff and page-exit flush. | Browser eviction and abrupt termination remain possible; analytics is not a transaction log. |
| Queue exhaustion / oversized payloads | Event, batch and queue limits; quota and drop diagnostics. | Tune limits and monitor diagnostics for the application's traffic. |
| Malicious or broken extension code | Plugin failures are isolated and reported without payloads; setup failure is explicit. | Treat custom plugins, codecs, compression, storage and transports as trusted code. |
| Credential leakage | `HttpTransport` omits credentials by default; diagnostics exclude headers and bodies. | Use HTTPS, narrow collector tokens and never embed privileged server secrets in a browser bundle. |
| Cross-origin ingestion abuse | Collector starter provides CORS allowlisting, body limits and protocol validation. | Authenticate/rate-limit where appropriate and validate event schemas server-side. |
| Supply-chain compromise | Lockfile, pinned GitHub Actions, package-content/budget checks and npm staged publishing. | Protect maintainer accounts, review dependency updates and verify provenance/release records. |
| Protocol downgrade or ambiguity | EventBatch v1 is explicit; starter rejects unsupported protocol versions. | Collector must reject unknown incompatible versions rather than guessing. |

## Availability and failure posture

Analytics is best effort. Delivery failures retain retryable events and expose
payload-free diagnostics. A successful HTTP `2xx` means the entire batch has
been durably accepted, including duplicates. Browsers can terminate pages,
evict storage or block endpoints, so Tracelet cannot promise exactly-once or
lossless delivery.

Consent withdrawal is different from ordinary analytics failure: if configured
queue or identity clearing fails, the caller must be able to observe that
failure rather than receive a false erasure guarantee.

## Non-goals

- Defending against XSS or a malicious dependency already executing in the
  application's origin.
- Encrypting queued data against same-origin JavaScript; keys available to the
  page would also be available to an attacker in that page.
- Hiding browser network metadata from the Collector.
- Replacing server-side authentication, authorization, schema validation,
  retention or deletion controls.
- Providing financial, medical or audit-grade guaranteed delivery.

Security reports should follow [`SECURITY.md`](../SECURITY.md).

