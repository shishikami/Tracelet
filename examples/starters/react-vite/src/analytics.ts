import { ConsoleTransport, IndexedDbEventStorage, createAnalytics } from "tracelet-browser";

export interface StorefrontEvents {
  product_viewed: { productId: string; price: number };
  checkout_started: { cartId: string; itemCount: number };
}

export const analytics = createAnalytics<StorefrontEvents>({
  appId: "tracelet-react-starter",
  environment: "development",
  eventStorage: new IndexedDbEventStorage({ databaseName: "tracelet-react-starter" }),
  // Replace ConsoleTransport with HttpTransport for a real collector.
  transport: new ConsoleTransport(),
});
