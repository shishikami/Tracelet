import {
  BrowserLocalStorage,
  ConsoleTransport,
  HttpTransport,
  IndexedDbEventStorage,
  createAnalytics,
  redactPlugin,
} from "../src/index.js";

interface AppEvents {
  product_viewed: {
    productId: string;
    category?: string;
  };
  order_submitted: {
    orderId: string;
    amount: number;
    currency: "CNY" | "USD";
  };
}

const analytics = createAnalytics<AppEvents>({
  appId: "commerce-web",
  appVersion: "1.0.0",
  environment: "production",
  identityStorage: new BrowserLocalStorage(),
  eventStorage: new IndexedDbEventStorage({
    databaseName: "commerce-analytics",
  }),
  consent: {
    initialState: "granted",
    clearQueueOnDenied: true,
  },
  transport:
    location.hostname === "localhost"
      ? new ConsoleTransport()
      : new HttpTransport({ endpoint: "https://events.example.com/v1/batch" }),
  plugins: [redactPlugin(["password", "token", "authorization"])],
});

await analytics.init();

await analytics.track("product_viewed", {
  productId: "p_123",
  category: "book",
});

await analytics.track("order_submitted", {
  orderId: "o_456",
  amount: 199,
  currency: "CNY",
});
