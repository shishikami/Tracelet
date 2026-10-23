"use client";

import { useEffect } from "react";
import { analytics } from "./analytics";

export function TraceletClient() {
  useEffect(() => {
    void analytics.init();
    // Do not call shutdown here: React development mode may replay effects,
    // while this singleton is intended to live for the whole application.
  }, []);

  return null;
}
