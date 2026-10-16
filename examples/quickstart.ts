import {
  HttpTransport,
  IndexedDbEventStorage,
  createAnalytics,
} from "tracelet-browser";

const analytics = createAnalytics({
  appId: "commerce-web",
  eventStorage: new IndexedDbEventStorage(),
  transport: new HttpTransport({
    endpoint: "https://events.example.com/v1/batch",
  }),
});

await analytics.init();
await analytics.track("product_viewed", {
  productId: "sku_123",
});
