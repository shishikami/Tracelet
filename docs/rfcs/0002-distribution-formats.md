# RFC 0002: Distribution formats for Tracelet 0.3

- Status: Accepted
- Decision date: 2026-10-23
- Applies to: `tracelet-browser@0.3.x`

## Context

Tracelet currently publishes a typed native-ESM package. The 0.3 roadmap asked
whether the stable release should also add CommonJS or a global IIFE/CDN build.
Every extra format creates another public entry point that must preserve export
parity, browser behavior, package size, source maps and security guidance.

The supported integration surface for 0.3 is modern applications using a
package manager and a production bundler. The ecosystem smoke test installs the
actual tarball and proves React + Vite, Vue + Vite, Next.js/Turbopack, Webpack
and Rollup production builds. This covers the intended users without adding a
second runtime artifact.

## Decision

Tracelet 0.3 remains native ESM-only:

- Keep the existing typed root export and `sideEffects: false` contract.
- Support package-manager consumers through Vite, Next.js, Webpack and Rollup.
- Do not add CommonJS, UMD, IIFE or a mutable global namespace in 0.3.
- Treat direct CDN `<script>` installation as deferred, not implicitly
  supported.

## Why not add an IIFE now?

- A global build needs a documented namespace, initialization ordering and
  duplicate-load behavior that do not exist in the ESM API.
- CDN examples require explicit version pinning, Subresource Integrity and CSP
  guidance; an unpinned `latest` URL would weaken reproducibility.
- A second artifact would need its own package-size budget and browser suite.
- No current integration report requires a no-bundler path.

## Revisit criteria

Reopen this decision when real users provide at least one concrete environment
that cannot use native ESM or a supported bundler. A future proposal must define
the global API, version pinning, SRI generation, CSP behavior, duplicate-load
semantics and automated parity tests before an IIFE/CDN artifact is published.
