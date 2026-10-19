import { createContext, useContext, type ReactNode } from "react";

export type Locale = "zh-CN" | "en";

const LocaleContext = createContext<Locale>("zh-CN");

export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale: Locale = document.documentElement.lang === "en" || location.pathname.startsWith("/en")
    ? "en"
    : "zh-CN";

  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function localizedPath(locale: Locale): string {
  return locale === "en" ? "/en" : "/";
}
