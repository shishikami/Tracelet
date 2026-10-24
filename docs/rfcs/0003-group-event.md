# RFC 0003: Reserved `group` protocol event

- Status: Accepted
- Decision date: 2026-10-24
- Applies to: EventBatch v1 and `tracelet-browser@0.4.x`

## Context

The exported `EventType` union includes `"group"`, and EventBatch v1 reserves
that value, but the `Analytics` client exposes no `group()` method. Adding a
public method now would create an identity/group association model before a
real integration has established its identifiers, traits, persistence and
Collector semantics.

## Decision

- Keep `"group"` in `EventType` so protocol decoders and custom event tooling
  can represent the reserved value without a breaking type change.
- Do not add `Analytics.group()` in 0.4.
- The built-in client does not generate `group` events; `track()`, `page()` and
  `identify()` retain their existing event types.
- Collectors may accept and store a structurally valid `group` event, but must
  not infer account-membership behavior that EventBatch v1 does not define.
- Revisit the method only after a real consumer supplies an end-to-end group
  identity use case. A proposal must define identifier, traits, ordering,
  consent, persistence and migration semantics.

## Compatibility consequence

This resolves the apparent mismatch without expanding the public client API.
Removing `"group"` would be an unnecessary declaration break; adding a method
would prematurely commit Tracelet 1.0 to semantics that have not been operated
in production.

