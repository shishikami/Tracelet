# Website framework decision

## Current decision

Keep the documentation site on React and Vite through the `0.4.0` contract-hardening cycle. The site now has multiple addressable documentation routes, but still has no server data, authentication or content collection. Migrating frameworks while the SDK contract is being hardened would add more regression surface than product value.

The Vite build now generates route-specific HTML files with canonical metadata, reciprocal `hreflang`, structured data and an equivalent static summary in the first response. React replaces that summary after loading. This closes the immediate crawlability gap without serving bot-specific content, while keeping the interactive Playground and documentation search unchanged.

Internationalization uses two static HTML entry points:

- `/` for Simplified Chinese (`zh-CN`)
- `/en` for English (`en`)

Both entries share the same React components, but have independent metadata, canonical URLs and reciprocal `hreflang` links. Locale selection therefore remains addressable, bookmarkable and crawler-friendly without a runtime i18n dependency.

## When to reconsider

Re-evaluate the framework when at least one of these becomes true:

- Documentation grows beyond the current hand-maintained pages or adds versioned API documentation.
- Markdown or MDX becomes the primary authoring format.
- Navigation, search, versioned documentation or automatic table-of-contents generation is required.
- Complete article content—not only the current descriptive summary—must be available in the initial HTML without JavaScript execution.
- Contributors need a content-oriented workflow rather than editing TSX components.

## Preferred migration target

Astro remains the preferred next step for a documentation-first site. Re-evaluate it after the `0.4.0` contract-hardening release using Search Console rendering evidence, content volume and contributor friction. It can statically render localized content, keep React islands for the Playground, search and copy buttons, and avoid shipping React for non-interactive documentation.

Next.js is appropriate only if Tracelet later needs server-side application behavior, authenticated dashboards, API routes or tight integration with a larger React application. Those requirements do not exist today.

## Migration boundary

Keep locale-independent content and UI primitives separate from routing. A future Astro migration should preserve `/` and `/en`, canonical URLs, heading anchors and the public files in `website/public/` so existing search and documentation links remain valid.
