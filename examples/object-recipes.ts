import {
  BrowserLocalStorage,
  HttpTransport,
  IndexedDbEventStorage,
  createAnalytics,
  createAutoCapturePlugin,
  redactPlugin,
  samplingPlugin,
} from "tracelet-browser";

interface ShopEvents {
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

const eventStorage = new IndexedDbEventStorage({
  databaseName: "shop-analytics",
});

export const analytics = createAnalytics<ShopEvents>({
  appId: "shop-web",
  appVersion: "1.0.0",
  environment: "production",
  identityStorage: new BrowserLocalStorage("shop_analytics_"),
  eventStorage,
  transport: new HttpTransport({
    endpoint: "https://events.example.com/v1/batch",
    timeoutMs: 10_000,
  }),
  consent: {
    initialState: "pending",
    clearQueueOnDenied: true,
  },
  plugins: [
    redactPlugin(["password", "token"]),
    samplingPlugin({ debug_log: 0.1 }),
    createAutoCapturePlugin({
      pageViews: { initial: true, includeHash: false },
      errors: { includeStack: false },
    }),
  ],
  onDiagnostic(event) {
    if (event.type === "flush_failed") {
      console.warn("Tracelet delivery failed", event);
    }
  },
});

// 在 CMP 或隐私弹窗允许采集后调用。
await analytics.setConsent("granted");
await analytics.init();

await analytics.track("product_viewed", {
  productId: "sku_123",
  category: "keyboard",
});
