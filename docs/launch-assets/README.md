# Launch assets

These screenshots support the Product Hunt, Show HN and community launch material in [`../launch-kit.md`](../launch-kit.md).

Regenerate them from a running local site:

```bash
pnpm build:docs
pnpm local:server
pnpm capture:launch-assets
```

To capture a reviewed production deployment instead:

```bash
TRACELET_CAPTURE_BASE_URL=https://tracelet-opal.vercel.app pnpm capture:launch-assets
```

The script uses a fixed 1440×900 dark-mode viewport and reproduces the Playground failure state before taking the screenshot. Review every image before publishing because documentation and browser rendering can change.
