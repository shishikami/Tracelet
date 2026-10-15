import type { AnalyticsPlugin } from "./contracts.js";

export function redactPlugin(blockedKeys: readonly string[]): AnalyticsPlugin {
  const blocked = new Set(blockedKeys);

  return {
    name: "redact",
    beforeTrack(event) {
      const properties = Object.fromEntries(
        Object.entries(event.properties).filter(([key]) => !blocked.has(key)),
      );
      return { ...event, properties };
    },
  };
}

export function samplingPlugin(rates: Record<string, number>): AnalyticsPlugin {
  return {
    name: "sampling",
    beforeTrack(event) {
      const rate = rates[event.name] ?? 1;
      return Math.random() <= Math.max(0, Math.min(1, rate)) ? event : null;
    },
  };
}
