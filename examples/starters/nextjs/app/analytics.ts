"use client";

import {
  BrowserLocalStorage,
  ConsoleTransport,
  IndexedDbEventStorage,
  createAnalytics,
} from "tracelet-browser";

interface AppEvents {
  demo_clicked: {
    source: "nextjs-starter";
  };
}

// This module is only reachable through Client Components. Keeping one module
// singleton prevents a new queue, identity and retry timer on every render.
export const analytics = createAnalytics<AppEvents>({
  appId: "tracelet-nextjs-starter",
  eventStorage: new IndexedDbEventStorage({ databaseName: "tracelet-nextjs-starter" }),
  identityStorage: new BrowserLocalStorage("tracelet_nextjs_"),
  transport: new ConsoleTransport(),
});
