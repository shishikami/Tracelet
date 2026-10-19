# Website framework decision

## Current decision

Keep the documentation site on React and Vite for now. The site is a small, static product page with no server data, authentication, content collection, or page-level routing. Introducing a metaframework today would increase build and maintenance surface without unlocking a required product capability.

Internationalization uses two static HTML entry points:

- `/` for Simplified Chinese (`zh-CN`)
- `/en` for English (`en`)

Both entries share the same React components, but have independent metadata, canonical URLs and reciprocal `hreflang` links. Locale selection therefore remains addressable, bookmarkable and crawler-friendly without a runtime i18n dependency.

## When to reconsider

Re-evaluate the framework when at least one of these becomes true:

- Documentation grows into multiple independently addressable pages.
- Markdown or MDX becomes the primary authoring format.
- Navigation, search, versioned documentation or automatic table-of-contents generation is required.
- Important content must be available in the initial HTML without JavaScript execution.
- Contributors need a content-oriented workflow rather than editing TSX components.

## Preferred migration target

Astro is the preferred next step for a documentation-first site. It can statically render localized content, keep React islands for interactive components such as package-manager tabs and copy buttons, and avoid shipping React for non-interactive documentation.

Next.js is appropriate only if Tracelet later needs server-side application behavior, authenticated dashboards, API routes or tight integration with a larger React application. Those requirements do not exist today.

## Migration boundary

Keep locale-independent content and UI primitives separate from routing. A future Astro migration should preserve `/` and `/en`, canonical URLs, heading anchors and the public files in `website/public/` so existing search and documentation links remain valid.
