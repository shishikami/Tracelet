# Tracelet Accessibility Statement

## Commitment

Tracelet aims to make its documentation, Playground and contribution workflow usable by as many people as possible. The website targets WCAG 2.2 Level AA as an engineering goal, but it has not completed an independent conformance audit and does not claim formal certification.

The SDK itself does not render user interface. Accessibility requirements primarily apply to the documentation website, runnable starters and project collaboration spaces.

## Current measures

The website currently includes:

- Semantic headings, navigation landmarks, form labels and descriptive control names.
- Visible keyboard focus and keyboard operation for documentation search, menus, tabs and interactive examples.
- Live-region or alert semantics for search results, copy status, validation errors and Playground diagnostics.
- A reduced-motion mode that minimizes animation and smooth scrolling when requested by the operating system.
- Responsive layouts, text wrapping and horizontally scrollable code samples on narrow screens.
- Chinese and English documentation routes with corresponding navigation labels.
- Automated browser coverage in Chromium, Firefox and WebKit, including keyboard search and smaller-screen documentation navigation.

## Supported environments

We prioritize current stable releases of Chrome/Chromium, Firefox and Safari/WebKit on desktop and mobile-sized layouts. Other browsers and assistive technologies may work, but they are not yet part of a continuous compatibility matrix.

## Known limitations

- Long code samples and JSON payloads may require horizontal scrolling at high zoom or on narrow screens.
- The project has not yet completed a dedicated screen-reader matrix or independent WCAG audit.
- GitHub, npm, StackBlitz and Vercel pages linked from Tracelet are controlled by their respective providers.

These limitations are not a reason to close a report. Reproducible barriers will be prioritized according to impact.

## Report an accessibility barrier

Open a [Bug report](https://github.com/shishikami/Tracelet/issues/new?template=bug.yml) when the report can be public and contains no personal or sensitive information. Prefix the title with `[Accessibility]` and include:

- The affected URL or project file.
- Browser, operating system and relevant assistive technology.
- Steps to reproduce, expected behavior and actual behavior.
- A minimal screenshot or synthetic example only when it is safe to share.

For a report that must remain private, contact the repository owner using the email published on the owner's GitHub profile. Security vulnerabilities should instead follow [SECURITY.md](./SECURITY.md).

This statement was last reviewed on 2026-10-20.
