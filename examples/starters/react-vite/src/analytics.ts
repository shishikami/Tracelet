import { ConsoleTransport, IndexedDbEventStorage, createAnalytics, type DiagnosticEvent } from "tracelet-browser";

export interface StorefrontEvents {
  product_viewed: { productId: string; price: number };
  checkout_started: { cartId: string; itemCount: number };
}

const listeners = new Set<(event: DiagnosticEvent) => void>();

export const analytics = createAnalytics<StorefrontEvents>({
  appId: "tracelet-react-starter",
  environment: "development",
  eventStorage: new IndexedDbEventStorage({ databaseName: "tracelet-react-starter" }),
  // Replace ConsoleTransport with HttpTransport for a real collector.
  transport: new ConsoleTransport(),
  onDiagnostic(event) {
    for (const listener of listeners) listener(event);
  },
});

export function subscribeToDiagnostics(listener: (event: DiagnosticEvent) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
