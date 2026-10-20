# Tracelet + React + Vite

```bash
npm install
npm run dev
```

The starter keeps one application-wide Tracelet instance, initializes it once from the root React component, and displays SDK diagnostics. It uses `ConsoleTransport` so it works without a backend; replace it with `HttpTransport` when your collector is ready.
