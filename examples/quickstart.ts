import {
  HttpTransport,
  createAutoCapturePlugin,
  createAnalytics,
  createBrowserEventStorage,
} from "tracelet-browser";

const eventStorage = await createBrowserEventStorage({
  databaseName: "commerce-analytics",
  onFallback(error) {
    console.warn("Tracelet is using an in-memory queue", error);
  },
});

// Create one shared SDK instance for the lifetime of the application.
const analytics = createAnalytics({
  appId: "commerce-web",
  // IndexedDB keeps unsent events across reloads and offline periods.
  eventStorage,
  transport: new HttpTransport({
    endpoint: "https://events.example.com/v1/batch",
  }),
  // Optional: observes navigation and global errors without scanning the DOM.
  plugins: [createAutoCapturePlugin({ pageViews: true, errors: true })],
});

await analytics.init();

// Business-critical events should remain explicit and semantically named.
await analytics.track("product_viewed", {
  productId: "sku_123",
});
