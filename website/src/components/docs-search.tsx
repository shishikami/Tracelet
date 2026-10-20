import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale, type Locale } from "@/i18n";
import { sitePath, type SitePage } from "@/routing";

interface SearchEntry {
  id: string;
  category: string;
  title: string;
  description: string;
  keywords: string;
}

const searchEntries: Record<Locale, readonly SearchEntry[]> = {
  "zh-CN": [
    { id: "playground", category: "在线体验", title: "交互式 Playground", description: "运行真实 SDK，观察队列、诊断、失败重试与 EventBatch。", keywords: "playground demo 在线体验 queue retry EventBatch mock collector" },
    { id: "starters", category: "示例", title: "一键运行模板", description: "React、Vue 与 Vercel Collector 完整项目。", keywords: "starter StackBlitz React Vue Vercel Collector 模板" },
    { id: "guide-architecture", category: "架构文章", title: "设计后端无关的浏览器埋点 SDK", description: "稳定契约、可靠队列、Consent 与可替换投递边界。", keywords: "architecture sdk design backend agnostic 架构 后端解耦" },
    { id: "seo-guide-evaluation", category: "选型指南", title: "TypeScript 前端埋点 SDK：从选型到上线", description: "评估类型安全、隐私、离线队列、后端自主权与生产可观测性。", keywords: "typescript 前端埋点 sdk 浏览器埋点 离线队列 隐私 选型 analytics" },
    { id: "architecture", category: "概览", title: "SDK 架构", description: "核心契约、Adapter 与后端解耦边界。", keywords: "architecture 架构 pipeline 管线 adapter" },
    { id: "manual-setup", category: "快速开始", title: "安装与 Quickstart", description: "从 npm 安装并创建第一个 SDK 实例。", keywords: "install npm pnpm yarn quickstart 安装" },
    { id: "delivery", category: "可靠性", title: "可靠投递", description: "本地队列、批次、重试和 eventId 去重。", keywords: "delivery retry queue eventId 重试 队列" },
    { id: "manual-api", category: "用户手册", title: "类型安全核心 API", description: "track、page、identify 与 EventMap。", keywords: "track page identify EventMap 类型" },
    { id: "manual-objects", category: "用户手册", title: "SDK 对象选型", description: "客户端、Transport、Storage、Codec、Compression 与 Plugin 的选择和实例代码。", keywords: "对象 实例 createAnalytics HttpTransport IndexedDbEventStorage Codec Compression Plugin" },
    { id: "manual-object-transports", category: "对象手册", title: "Transport 实例", description: "HttpTransport、ConsoleTransport 与 EventRouter。", keywords: "transport HttpTransport ConsoleTransport EventRouter endpoint" },
    { id: "manual-object-storage", category: "对象手册", title: "Storage 实例", description: "IndexedDB、LocalStorage 与 Memory 存储如何选择。", keywords: "storage IndexedDbEventStorage BrowserLocalStorage MemoryEventStorage MemoryKeyValueStorage" },
    { id: "manual-object-processing", category: "对象手册", title: "Codec 与 Compression", description: "JSON、Protobuf、gzip 与不压缩策略。", keywords: "codec compression JsonCodec ProtobufCodec GzipCompression NoCompression" },
    { id: "manual-object-plugins", category: "对象手册", title: "Plugin 实例", description: "脱敏、采样与自动采集插件的组合顺序。", keywords: "plugin redact sampling autocapture 插件 脱敏 采样" },
    { id: "manual-object-advanced", category: "对象手册", title: "高级对象与工具", description: "DeliveryLock、Consent、Identity、配额与版本工具。", keywords: "BrowserDeliveryLock ConsentManager IdentityManager createId SDK_VERSION quota" },
    { id: "manual-object-custom", category: "对象手册", title: "自定义 Adapter 与 Plugin", description: "通过稳定契约扩展 Tracelet。", keywords: "custom adapter Transport AnalyticsPlugin 自定义 插件" },
    { id: "manual-autocapture", category: "用户手册", title: "低侵入自动采集", description: "SPA 页面浏览、全局错误和隐私边界。", keywords: "autocapture pageview error 自动采集 错误" },
    { id: "manual-consent", category: "用户手册", title: "Consent 授权", description: "pending、granted、denied 与撤回授权。", keywords: "consent privacy CMP 隐私 授权" },
    { id: "manual-lifecycle", category: "用户手册", title: "身份与生命周期", description: "Session、reset、flush 和 shutdown。", keywords: "session reset flush shutdown 生命周期 身份" },
    { id: "manual-routing", category: "用户手册", title: "多 Collector 条件路由", description: "EventRouter、TransportResolver 与 fallback。", keywords: "EventRouter transport route collector 路由 多后端" },
    { id: "manual-storage", category: "用户手册", title: "浏览器存储配额", description: "IndexedDB 配额估算与 storage_quota_exceeded。", keywords: "IndexedDB storage quota estimate 配额 容量" },
    { id: "manual-frameworks", category: "框架适配", title: "React、Vue 与 Next.js", description: "单例、挂载生命周期和 SSR 客户端边界。", keywords: "React Vue Next.js SSR framework 框架" },
    { id: "manual-collector", category: "服务端", title: "Collector 接收契约", description: "EventBatch、CORS、状态码和幂等去重。", keywords: "collector backend CORS HTTP EventBatch 服务端" },
    { id: "manual-production", category: "上线", title: "诊断与上线清单", description: "onDiagnostic、CSP 与生产验证。", keywords: "diagnostic CSP production 上线 诊断" },
    { id: "api-client", category: "API Reference", title: "Analytics 实例方法", description: "查询全部客户端公开方法与返回值。", keywords: "API methods analytics 方法" },
    { id: "api-options", category: "API Reference", title: "createAnalytics 配置项", description: "查询必填项、默认值、限制与可替换边界。", keywords: "options config createAnalytics 配置 默认值" },
    { id: "api-adapters", category: "API Reference", title: "内置 Adapter", description: "Transport、Storage、Codec 与 Compression。", keywords: "adapter transport storage codec compression" },
    { id: "api-advanced", category: "API Reference", title: "高级对象与工具", description: "底层 Manager、DeliveryLock、配额错误和 SDK 常量。", keywords: "ConsentManager IdentityManager DeliveryLock createId StorageQuota SDK_VERSION" },
    { id: "api-diagnostics", category: "API Reference", title: "DiagnosticEvent", description: "SDK 生命周期、队列快照与异常诊断事件。", keywords: "DiagnosticEvent event_dropped flush_failed subscribeDiagnostics getQueueSnapshot 诊断 队列快照" },
  ],
  en: [
    { id: "playground", category: "Try it", title: "Interactive Playground", description: "Run the real SDK and inspect its queue, diagnostics, retries and EventBatch.", keywords: "playground demo live queue retry EventBatch mock collector" },
    { id: "starters", category: "Examples", title: "Runnable starters", description: "Complete React, Vue and Vercel Collector projects.", keywords: "starter StackBlitz React Vue Vercel Collector template" },
    { id: "guide-architecture", category: "Architecture", title: "Designing a backend-agnostic browser analytics SDK", description: "Stable contracts, durable queues, consent and replaceable delivery boundaries.", keywords: "architecture sdk design backend agnostic decoupling" },
    { id: "seo-guide-evaluation", category: "Evaluation", title: "Choose a TypeScript browser analytics SDK", description: "Evaluate typed events, privacy, offline queues, backend ownership and production observability.", keywords: "typescript browser analytics sdk frontend tracking offline queue privacy evaluation" },
    { id: "architecture", category: "Overview", title: "SDK architecture", description: "Core contracts, adapters and backend decoupling boundaries.", keywords: "architecture pipeline adapter core" },
    { id: "manual-setup", category: "Quickstart", title: "Install and quickstart", description: "Install from npm and create the first SDK instance.", keywords: "install npm pnpm yarn quickstart" },
    { id: "delivery", category: "Reliability", title: "Reliable delivery", description: "Local queues, batching, retries and eventId deduplication.", keywords: "delivery retry queue eventId" },
    { id: "manual-api", category: "User guide", title: "Type-safe core API", description: "track, page, identify and EventMap.", keywords: "track page identify EventMap types" },
    { id: "manual-objects", category: "User guide", title: "Choose SDK objects", description: "Client, Transport, Storage, Codec, Compression and Plugin examples.", keywords: "objects instances createAnalytics HttpTransport IndexedDbEventStorage Codec Compression Plugin" },
    { id: "manual-object-transports", category: "Object guide", title: "Transport instances", description: "HttpTransport, ConsoleTransport and EventRouter.", keywords: "transport HttpTransport ConsoleTransport EventRouter endpoint" },
    { id: "manual-object-storage", category: "Object guide", title: "Storage instances", description: "Choose between IndexedDB, LocalStorage and memory storage.", keywords: "storage IndexedDbEventStorage BrowserLocalStorage MemoryEventStorage MemoryKeyValueStorage" },
    { id: "manual-object-processing", category: "Object guide", title: "Codec and Compression", description: "JSON, Protobuf, gzip and pass-through strategies.", keywords: "codec compression JsonCodec ProtobufCodec GzipCompression NoCompression" },
    { id: "manual-object-plugins", category: "Object guide", title: "Plugin instances", description: "Compose redaction, sampling and autocapture in the correct order.", keywords: "plugin redact sampling autocapture privacy" },
    { id: "manual-object-advanced", category: "Object guide", title: "Advanced objects and utilities", description: "DeliveryLock, consent, identity, quota and version utilities.", keywords: "BrowserDeliveryLock ConsentManager IdentityManager createId SDK_VERSION quota" },
    { id: "manual-object-custom", category: "Object guide", title: "Custom adapters and plugins", description: "Extend Tracelet through stable contracts.", keywords: "custom adapter Transport AnalyticsPlugin extension" },
    { id: "manual-autocapture", category: "User guide", title: "Low-impact autocapture", description: "SPA navigation, global errors and privacy boundaries.", keywords: "autocapture pageview error privacy" },
    { id: "manual-consent", category: "User guide", title: "Consent", description: "pending, granted, denied and consent withdrawal.", keywords: "consent privacy CMP" },
    { id: "manual-lifecycle", category: "User guide", title: "Identity and lifecycle", description: "Sessions, reset, flush and shutdown.", keywords: "session reset flush shutdown lifecycle identity" },
    { id: "manual-routing", category: "User guide", title: "Multi-collector routing", description: "EventRouter, TransportResolver and fallback behavior.", keywords: "EventRouter transport route collector routing backend" },
    { id: "manual-storage", category: "User guide", title: "Browser storage quota", description: "IndexedDB estimates and storage_quota_exceeded diagnostics.", keywords: "IndexedDB storage quota estimate capacity" },
    { id: "manual-frameworks", category: "Frameworks", title: "React, Vue and Next.js", description: "Singletons, mount lifecycles and SSR client boundaries.", keywords: "React Vue Next.js SSR framework" },
    { id: "manual-collector", category: "Backend", title: "Collector contract", description: "EventBatch, CORS, status codes and idempotency.", keywords: "collector backend CORS HTTP EventBatch" },
    { id: "manual-production", category: "Production", title: "Diagnostics and launch checklist", description: "onDiagnostic, CSP and production verification.", keywords: "diagnostic CSP production checklist" },
    { id: "api-client", category: "API Reference", title: "Analytics methods", description: "Browse public client methods and return types.", keywords: "API methods analytics" },
    { id: "api-options", category: "API Reference", title: "createAnalytics options", description: "Look up required values, defaults, limits and replaceable boundaries.", keywords: "options config createAnalytics defaults" },
    { id: "api-adapters", category: "API Reference", title: "Built-in adapters", description: "Transport, Storage, Codec and Compression exports.", keywords: "adapter transport storage codec compression" },
    { id: "api-advanced", category: "API Reference", title: "Advanced objects and utilities", description: "Low-level managers, DeliveryLock, quota errors and SDK constants.", keywords: "ConsentManager IdentityManager DeliveryLock createId StorageQuota SDK_VERSION" },
    { id: "api-diagnostics", category: "API Reference", title: "DiagnosticEvent", description: "SDK lifecycle, queue snapshots and failure diagnostics.", keywords: "DiagnosticEvent event_dropped flush_failed subscribeDiagnostics getQueueSnapshot queue snapshot" },
  ],
};

interface DocsSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocsSearch({ open, onOpenChange }: DocsSearchProps) {
  const locale = useLocale();
  const en = locale === "en";
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const entries = searchEntries[locale];
  const results = useMemo(() => rankEntries(entries, query).slice(0, 8), [entries, query]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    let focusFrame: number | undefined;
    if (open && !dialog.open) {
      setQuery("");
      dialog.showModal();
      focusFrame = requestAnimationFrame(() => inputRef.current?.focus());
    } else if (!open && dialog.open) {
      dialog.close();
    }
    return () => {
      if (focusFrame !== undefined) cancelAnimationFrame(focusFrame);
    };
  }, [open]);

  useEffect(() => {
    const openFromKeyboard = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(true);
      }
    };
    document.addEventListener("keydown", openFromKeyboard);
    return () => document.removeEventListener("keydown", openFromKeyboard);
  }, [onOpenChange]);

  const close = () => onOpenChange(false);

  return (
    <dialog
      ref={dialogRef}
      className="docs-search-dialog m-auto w-[min(680px,calc(100%-2rem))] rounded-2xl border border-white/12 bg-[#0a1012] p-0 text-slate-100 shadow-2xl shadow-black/60"
      aria-labelledby="docs-search-title"
      onCancel={(event) => { event.preventDefault(); close(); }}
      onClose={close}
      onClick={(event) => { if (event.target === event.currentTarget) close(); }}
      onKeyDown={(event) => {
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        const links = Array.from(
          dialogRef.current?.querySelectorAll<HTMLAnchorElement>("[data-search-result]") ?? [],
        );
        const current = links.indexOf(document.activeElement as HTMLAnchorElement);
        if (current < 0) return;
        event.preventDefault();
        const offset = event.key === "ArrowDown" ? 1 : -1;
        links[(current + offset + links.length) % links.length]?.focus();
      }}
    >
      <div className="border-b border-white/10 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p id="docs-search-title" className="font-semibold">{en ? "Search documentation" : "搜索文档"}</p>
            <p className="mt-1 text-xs text-slate-500">{en ? "Search guides, APIs and framework examples" : "查找手册、API 和框架示例"}</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={close} aria-label={en ? "Close search" : "关闭搜索"}><X className="size-4" /></Button>
        </div>
        <label className="mt-4 flex h-12 items-center gap-3 rounded-xl border border-white/12 bg-black/25 px-4 focus-within:border-emerald-300/40 focus-within:ring-2 focus-within:ring-emerald-400/15">
          <Search className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
          <span className="sr-only">{en ? "Search query" : "搜索关键词"}</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                dialogRef.current?.querySelector<HTMLAnchorElement>("[data-search-result]")?.focus();
              }
            }}
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
            placeholder={en ? "Try “routing”, “quota” or “consent”" : "试试“路由”、“配额”或“Consent”"}
            type="search"
          />
          <kbd className="hidden rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 sm:block">Esc</kbd>
        </label>
      </div>

      <div className="max-h-[min(62vh,520px)] overflow-y-auto p-2" aria-live="polite">
        {results.length > 0 ? (
          <ul>
            {results.map((entry) => (
              <li key={entry.id}>
                <a
                  data-search-result
                  href={`${sitePath(pageForEntry(entry.id), locale)}#${entry.id}`}
                  onClick={close}
                  className="group flex items-start justify-between gap-4 rounded-xl px-4 py-3.5 outline-none hover:bg-white/6 focus-visible:bg-white/7 focus-visible:ring-2 focus-visible:ring-emerald-400/60"
                >
                  <span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-300/70">{entry.category}</span>
                    <strong className="mt-1 block text-sm font-medium text-slate-100">{entry.title}</strong>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">{entry.description}</span>
                  </span>
                  <ArrowRight className="mt-5 size-4 shrink-0 text-slate-700 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-300" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-12 text-center text-sm text-slate-500">{en ? "No matching documentation." : "没有找到匹配的文档。"}</p>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-white/8 px-5 py-3 text-[11px] text-slate-600">
        <span>{en ? `${results.length} result(s)` : `${results.length} 个结果`}</span>
        <span>{en ? "↑↓ navigate · Enter open" : "↑↓ 导航 · Enter 打开"}</span>
      </div>
    </dialog>
  );
}

function pageForEntry(id: string): SitePage {
  if (id === "playground") return "playground";
  if (id === "starters") return "examples";
  if (id === "guide-architecture") return "guide";
  if (id.startsWith("seo-guide-")) return "sdkGuide";
  if (id.startsWith("api-")) return "reference";
  if (id === "manual-objects" || id.startsWith("manual-object-")) return "examples";
  if (id.startsWith("manual-")) return "quickstart";
  return "home";
}

function rankEntries(entries: readonly SearchEntry[], query: string): SearchEntry[] {
  const tokens = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return entries.slice(0, 8);

  return entries
    .map((entry) => {
      const title = entry.title.toLocaleLowerCase();
      const haystack = `${title} ${entry.description} ${entry.keywords}`.toLocaleLowerCase();
      if (!tokens.every((token) => haystack.includes(token))) return undefined;
      const score = tokens.reduce((total, token) => {
        if (title === token) return total + 10;
        if (title.startsWith(token)) return total + 6;
        if (title.includes(token)) return total + 3;
        return total + 1;
      }, 0);
      return { entry, score };
    })
    .filter((item): item is { entry: SearchEntry; score: number } => item !== undefined)
    .sort((left, right) => right.score - left.score)
    .map(({ entry }) => entry);
}
