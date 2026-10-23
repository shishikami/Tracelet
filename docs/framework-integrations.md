# Framework integrations

Tracelet does not require a UI-framework wrapper. Keep one SDK instance for the browser application's lifetime, then connect initialization to the framework root.

## Shared rules

- Create the instance in a dedicated module rather than during component rendering.
- Mount initialization once at the application root.
- Do not call `shutdown()` from ordinary page or component cleanup. It is intended for a complete micro-frontend teardown, tests, or HMR disposal.
- In SSR frameworks, import the analytics singleton only through a client boundary. Never track during server rendering.
- Continue calling `track()` at explicit business-success points; a framework adapter is lifecycle wiring, not an event-design layer.

## React

Render `TraceletBootstrap` once near the root. The example deliberately avoids shutdown in the effect cleanup because React Strict Mode replays effects in development.

Source: [`examples/frameworks/react.tsx`](../examples/frameworks/react.tsx)

## Vue

Register `traceletPlugin` before `app.mount()`, then call `useTracelet()` from `setup()` or composables.

Source: [`examples/frameworks/vue.ts`](../examples/frameworks/vue.ts)

## Next.js

Render `TraceletClient` from the root layout. Its `"use client"` directive prevents initialization during React Server Component rendering. Keep event calls in Client Components or browser event handlers.

Source: [`examples/frameworks/nextjs-client.tsx`](../examples/frameworks/nextjs-client.tsx)

Runnable App Router project: [`examples/starters/nextjs`](../examples/starters/nextjs)

All three examples and their shared singleton are compiled by
`pnpm typecheck:frameworks` in CI. The React/Vite, Vue/Vite and Next.js starters
also install the current packed SDK and complete real production builds through
`pnpm smoke:ecosystem`; the same gate verifies Webpack and Rollup consumers.
