# Tracelet + Vue + Vite

```bash
npm install
npm run dev
```

The starter initializes one Tracelet instance before mounting Vue and keeps event calls in explicit business handlers. It uses `ConsoleTransport` so it works without a backend; replace it with `HttpTransport` when your collector is ready.
