import type { BeforeSend } from "@vercel/analytics/react";

const preferenceKey = "tracelet.site-analytics.v1";
const preferenceEvent = "tracelet:site-analytics-preference";

export type SiteAnalyticsStatus = "enabled" | "disabled" | "browser-disabled";

let runtimePreference: "disabled" | undefined;

function browserRequestsPrivacy(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") return false;

  const globalPrivacyControl = (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl;
  const legacyDoNotTrack = (window as Window & { doNotTrack?: string }).doNotTrack;
  const doNotTrack = navigator.doNotTrack ?? legacyDoNotTrack;

  return globalPrivacyControl === true || doNotTrack === "1" || doNotTrack === "yes";
}

function storedPreference(): "disabled" | undefined {
  if (runtimePreference) return runtimePreference;
  if (typeof window === "undefined") return undefined;

  try {
    return window.localStorage.getItem(preferenceKey) === "disabled" ? "disabled" : undefined;
  } catch {
    // Some hardened browsers deny storage access. The in-memory preference still
    // applies for the current page, and browser privacy signals remain respected.
    return runtimePreference;
  }
}

export function getSiteAnalyticsStatus(): SiteAnalyticsStatus {
  if (browserRequestsPrivacy()) return "browser-disabled";
  return storedPreference() === "disabled" ? "disabled" : "enabled";
}

export function setSiteAnalyticsEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;

  runtimePreference = enabled ? undefined : "disabled";
  try {
    if (enabled) window.localStorage.removeItem(preferenceKey);
    else window.localStorage.setItem(preferenceKey, "disabled");
  } catch {
    // Keep the session-scoped in-memory preference when persistent storage is
    // unavailable instead of turning analytics back on unexpectedly.
  }
  window.dispatchEvent(new Event(preferenceEvent));
}

export function subscribeToSiteAnalytics(callback: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  const onStorage = (event: StorageEvent) => {
    if (event.key === preferenceKey) callback();
  };
  window.addEventListener(preferenceEvent, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(preferenceEvent, callback);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Vercel calls this immediately before sending a pageview or custom event.
 * Returning null is the supported client-side opt-out path.
 */
export const filterSiteAnalyticsEvent: BeforeSend = (event) =>
  getSiteAnalyticsStatus() === "enabled" ? event : null;
