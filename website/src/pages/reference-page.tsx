import { ApiReference } from "@/components/api-reference";
import { ConfigurationReference } from "@/components/configuration-reference";
import { DocsLayout, type DocsNavigationItem } from "@/components/docs-layout";
import { useLocale } from "@/i18n";

const navigation: Record<"zh-CN" | "en", readonly DocsNavigationItem[]> = {
  "zh-CN": [
    { id: "api-options", label: "配置项" },
    { id: "api-client", label: "Analytics 方法" },
    { id: "api-adapters", label: "内置 Adapter" },
    { id: "api-advanced", label: "高级对象" },
    { id: "api-plugins", label: "内置插件" },
    { id: "api-diagnostics", label: "诊断事件" },
  ],
  en: [
    { id: "api-options", label: "Configuration options" },
    { id: "api-client", label: "Analytics methods" },
    { id: "api-adapters", label: "Built-in adapters" },
    { id: "api-advanced", label: "Advanced objects" },
    { id: "api-plugins", label: "Built-in plugins" },
    { id: "api-diagnostics", label: "Diagnostic events" },
  ],
};

export default function ReferencePage() {
  const locale = useLocale();
  const en = locale === "en";
  return (
    <DocsLayout
      page="reference"
      eyebrow="API Reference"
      title={en ? "Public API, precisely documented" : "准确查询每一个公开 API"}
      description={en ? <>Use this page when you already know what you need to look up. For a guided integration, begin with the Quickstart.</> : <>当你已经知道要查什么时使用本页；如果是第一次接入，请从 Quickstart 开始。</>}
      items={navigation[locale]}
    >
      <div className="space-y-16">
        <ConfigurationReference />
        <ApiReference embedded />
      </div>
    </DocsLayout>
  );
}
