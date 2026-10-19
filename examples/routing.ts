import {
  EventRouter,
  HttpTransport,
  createAnalytics,
} from "tracelet-browser";

const productCollector = new HttpTransport({
  name: "product-collector",
  endpoint: "https://events.example.com/v1/batch",
});

const alertCollector = new HttpTransport({
  name: "alert-collector",
  endpoint: "https://alerts.example.com/v1/batch",
});

const analytics = createAnalytics({
  appId: "commerce-web",
  transport: new EventRouter({
    // Rules are synchronous and evaluated in declaration order.
    routes: [{
      name: "technical-errors",
      match: (event) =>
        event.name === "$error" || event.name === "$unhandled_rejection",
      transport: alertCollector,
    }],
    // A required fallback ensures every queued event has a destination.
    fallback: productCollector,
  }),
  onDiagnostic(event) {
    if (event.type === "flush_started") {
      console.debug(`Sending ${event.eventCount} event(s) to ${event.transport}`);
    }
  },
});

await analytics.track("product_viewed", { productId: "sku_123" });
