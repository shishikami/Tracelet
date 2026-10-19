import { useEffect } from "react";
import { analytics } from "./analytics.js";

/** Mount once near the root of a client-rendered React application. */
export function TraceletBootstrap() {
  useEffect(() => {
    void analytics.init();
    // Do not shut down an application-wide singleton from ordinary component
    // cleanup; React Strict Mode intentionally replays effects in development.
  }, []);

  return null;
}

export { analytics };
