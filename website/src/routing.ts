import type { Locale } from "@/i18n";

export type SitePage = "home" | "quickstart" | "examples" | "reference";

const pageSegments: Record<SitePage, string> = {
  home: "",
  quickstart: "quickstart",
  examples: "examples",
  reference: "reference",
};

/** Resolve the documentation page from a public URL without coupling the site to a router package. */
export function pageFromPath(pathname = window.location.pathname): SitePage {
  const normalized = pathname.replace(/^\/en(?:\/|$)/, "/").replace(/^\/+|\/+$/g, "");
  if (normalized === "quickstart" || normalized === "examples" || normalized === "reference") {
    return normalized;
  }
  return "home";
}

/** Build a stable, locale-aware URL for every top-level page. */
export function sitePath(page: SitePage, locale: Locale): string {
  const prefix = locale === "en" ? "/en" : "";
  const segment = pageSegments[page];
  if (!segment) return prefix || "/";
  return `${prefix}/${segment}`;
}
