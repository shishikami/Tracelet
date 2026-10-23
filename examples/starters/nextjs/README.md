# Tracelet + Next.js

```bash
npm install
npm run dev
```

`TraceletClient` is mounted from the root layout while the SDK singleton stays
inside a client-only module. Event tracking remains in browser event handlers,
so no identity or analytics event is created during server rendering.

The starter uses `ConsoleTransport` so it runs without a backend. Replace it
with `HttpTransport` and configure Consent before using it in production.
