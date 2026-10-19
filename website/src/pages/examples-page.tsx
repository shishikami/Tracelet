import { DocsLayout, type DocsNavigationItem } from "@/components/docs-layout";
import { ObjectGuide } from "@/components/object-guide";
import { useLocale } from "@/i18n";

const navigation: Record<"zh-CN" | "en", readonly DocsNavigationItem[]> = {
  "zh-CN": [
    { id: "manual-objects", label: "对象选型" },
    { id: "manual-object-transports", label: "Transport 与路由" },
    { id: "manual-object-storage", label: "浏览器存储" },
    { id: "manual-object-processing", label: "Codec 与压缩" },
    { id: "manual-object-plugins", label: "插件组合" },
    { id: "manual-object-advanced", label: "高级对象" },
    { id: "manual-object-custom", label: "自定义扩展" },
  ],
  en: [
    { id: "manual-objects", label: "Choose objects" },
    { id: "manual-object-transports", label: "Transport and routing" },
    { id: "manual-object-storage", label: "Browser storage" },
    { id: "manual-object-processing", label: "Codec and compression" },
    { id: "manual-object-plugins", label: "Plugin composition" },
    { id: "manual-object-advanced", label: "Advanced objects" },
    { id: "manual-object-custom", label: "Custom extensions" },
  ],
};

export default function ExamplesPage() {
  const locale = useLocale();
  const en = locale === "en";
  return (
    <DocsLayout
      page="examples"
      eyebrow="Examples"
      title={en ? "Production-minded recipes" : "面向真实项目的场景示例"}
      description={en ? "Start with the complete setup, then copy only the transport, storage, encoding, plugin or extension recipe your application needs." : "先从完整生产配置理解对象关系，再按需复制 Transport、存储、编码、插件或自定义扩展示例。"}
      items={navigation[locale]}
    >
      <ObjectGuide />
    </DocsLayout>
  );
}
