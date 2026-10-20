# Tracelet support

Tracelet is maintained as an open-source project without a guaranteed response-time SLA. Please choose the narrowest channel for your question so other users can find the answer later.

## Learn and troubleshoot

1. Start with the [Quickstart](https://tracelet-opal.vercel.app/en/quickstart).
2. Reproduce the event lifecycle in the [Playground](https://tracelet-opal.vercel.app/en/playground).
3. Check the [Examples](https://tracelet-opal.vercel.app/en/examples) and [API Reference](https://tracelet-opal.vercel.app/en/reference).
4. Search existing [Issues](https://github.com/shishikami/Tracelet/issues) and [Discussions](https://github.com/shishikami/Tracelet/discussions).

## Where to ask

- **Usage, architecture and integration questions:** use the Q&A category in GitHub Discussions.
- **Ideas and API design proposals:** use the Ideas category in GitHub Discussions so the trade-offs can be discussed before implementation.
- **Reproducible defects:** open a [Bug report](https://github.com/shishikami/Tracelet/issues/new?template=bug.yml) with a minimal reproduction and diagnostics.
- **Security vulnerabilities:** do not create a public issue or discussion. Follow [SECURITY.md](./SECURITY.md) and use GitHub Private Vulnerability Reporting.
- **Conduct concerns:** follow the [Code of Conduct](./CODE_OF_CONDUCT.md) and contact the repository owner privately through the email published on the owner's GitHub profile.
- **Accessibility barriers:** follow [ACCESSIBILITY.md](./ACCESSIBILITY.md); use the Bug report template for public, sanitized reports.

Never include access tokens, production payloads, personal data or customer identifiers in a public report. Replace them with a minimal synthetic example.

## Scope

Maintainers can help with Tracelet's public API, built-in adapters, browser compatibility, examples and documentation. Debugging private collectors, vendor-specific schemas or unrelated application infrastructure may require a standalone reproduction using the public `Transport`, `Storage`, `Codec` or plugin contracts.
