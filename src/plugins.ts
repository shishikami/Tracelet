import type { AnalyticsPlugin } from "./contracts.js";

/** Remove exact property keys before an event reaches persistent storage. */
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

/** Sample individual event names with rates clamped to the inclusive 0..1 range. */
export function samplingPlugin(rates: Record<string, number>): AnalyticsPlugin {
  return {
    name: "sampling",
    beforeTrack(event) {
      const rate = rates[event.name] ?? 1;
      return Math.random() <= Math.max(0, Math.min(1, rate)) ? event : null;
    },
  };
}
