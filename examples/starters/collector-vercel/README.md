# Tracelet Vercel Collector starter

A minimal stateless Vercel Function for receiving Tracelet JSON batches at `POST /api/events`.

```bash
npm install
npm run dev
```

Configure the SDK with:

```ts
new HttpTransport({ endpoint: "https://your-project.vercel.app/api/events" })
```

This starter validates content type, batch size, required fields and duplicate `eventId` values within one request. It deliberately logs accepted IDs instead of pretending in-memory state is durable. Before production, add origin allowlisting, authentication, rate limiting, schema validation, durable storage or a queue, and cross-request idempotency keyed by `eventId`.
