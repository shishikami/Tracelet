"use client";

import { analytics } from "./analytics";

export function TrackedButton() {
  return (
    <button
      type="button"
      onClick={() => void analytics.track("demo_clicked", { source: "nextjs-starter" })}
    >
      Track an event
    </button>
  );
}
