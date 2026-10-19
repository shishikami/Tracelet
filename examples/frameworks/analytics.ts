import {
  BrowserLocalStorage,
  HttpTransport,
  IndexedDbEventStorage,
  createAnalytics,
} from "tracelet-browser";

interface AppEvents {
  product_viewed: { productId: string };
  checkout_completed: { orderId: string; amount: number };
}

/** One browser-lifetime instance shared by the framework adapter. */
export const analytics = createAnalytics<AppEvents>({
  appId: "commerce-web",
  identityStorage: new BrowserLocalStorage(),
  eventStorage: new IndexedDbEventStorage({ databaseName: "commerce-analytics" }),
  transport: new HttpTransport({ endpoint: "https://events.example.com/v1/batch" }),
});
