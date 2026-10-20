import { useSyncExternalStore } from "react";
import { useLocale } from "@/i18n";
import {
  getSiteAnalyticsStatus,
  setSiteAnalyticsEnabled,
  subscribeToSiteAnalytics,
} from "@/site-analytics";

const getServerSnapshot = () => "disabled" as const;

export function SiteAnalyticsControl() {
  const en = useLocale() === "en";
  const status = useSyncExternalStore(
    subscribeToSiteAnalytics,
    getSiteAnalyticsStatus,
    getServerSnapshot,
  );

  if (status === "browser-disabled") {
    return (
      <span className="text-xs text-slate-600" role="status">
        {en ? "Analytics disabled by your browser privacy signal." : "浏览器隐私信号已关闭匿名统计。"}
      </span>
    );
  }

  const enabled = status === "enabled";
  return (
    <button
      type="button"
      className="text-left text-xs text-slate-500 underline decoration-slate-700 underline-offset-4 transition hover:text-slate-300"
      aria-pressed={!enabled}
      onClick={() => setSiteAnalyticsEnabled(!enabled)}
    >
      {enabled
        ? (en ? "Disable anonymous analytics" : "关闭匿名统计")
        : (en ? "Enable anonymous analytics" : "启用匿名统计")}
    </button>
  );
}
