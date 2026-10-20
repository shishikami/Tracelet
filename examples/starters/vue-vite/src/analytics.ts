import { ConsoleTransport, IndexedDbEventStorage, createAnalytics } from "tracelet-browser";

interface StorefrontEvents {
  product_viewed: { productId: string; price: number };
  checkout_started: { cartId: string; itemCount: number };
}

export const analytics = createAnalytics<StorefrontEvents>({
  appId: "tracelet-vue-starter",
  environment: "development",
  eventStorage: new IndexedDbEventStorage({ databaseName: "tracelet-vue-starter" }),
  // Replace ConsoleTransport with HttpTransport for a real collector.
  transport: new ConsoleTransport(),
});
