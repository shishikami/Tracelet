"use client";

import { useEffect } from "react";
import { analytics } from "./analytics.js";

/**
 * Render from the root layout, but keep this file behind a Client Component
 * boundary so server rendering never initializes browser storage or listeners.
 */
export function TraceletClient() {
  useEffect(() => {
    void analytics.init();
  }, []);

  return null;
}

export { analytics };
