import { Braces, Database, Network, Puzzle } from "lucide-react";
import { useLocale } from "@/i18n";

const methods = [
  ["init()", "Promise<void>", "初始化插件、页面生命周期监听和定时 Flush；重复调用安全。"],
  ["track(name, properties, options?)", "Promise<void>", "记录类型安全的业务事件；未初始化时会自动初始化。"],
  ["page(name, properties?)", "Promise<void>", "记录 page 类型事件，适合页面或路由语义。"],
  ["identify(userId, traits?)", "Promise<void>", "关联登录用户并记录 $identify 事件。"],
  ["getConsent()", "ConsentState", "读取当前内存中的 Consent 状态。"],
  ["setConsent(state)", "Promise<void>", "更新 Consent；denied 默认清空队列和身份。"],
  ["reset()", "void", "清除用户关联并轮换匿名 ID 与 Session ID。"],
  ["getStorageEstimate()", "Promise<StorageEstimate | undefined>", "读取浏览器提供的原点级存储使用量与配额估算。"],
  ["getQueueSnapshot()", "Promise<QueueSnapshot>", "读取不可变的队列数量、最早事件时间与当前投递状态快照。"],
  ["subscribeDiagnostics(listener)", "() => void", "运行时订阅诊断事件；返回可重复调用的取消订阅函数。"],
  ["flush(reason?)", "Promise<void>", "立即尝试发送一个批次；同实例并发调用会合并。"],
  ["shutdown()", "Promise<void>", "最后 Flush，移除监听器并按逆序销毁插件。"],
] as const;

const adapters = [
  ["HttpTransport", "Transport", "通过 fetch 向 Collector POST 批次；支持超时、Retry-After 和 keepalive。"],
  ["ConsoleTransport", "Transport", "把编码批次输出到控制台，适合本地调试。"],
  ["EventRouter", "TransportResolver", "按事件条件选择 Transport；首条匹配规则优先，未匹配事件进入 fallback。"],
  ["IndexedDbEventStorage", "EventStorage", "浏览器持久化 FIFO 队列，生产环境推荐。"],
  ["createBrowserEventStorage", "function", "启动时探测 IndexedDB；无法打开时返回显式配置的内存或自定义后备队列。"],
  ["MemoryEventStorage", "EventStorage", "刷新即丢失的内存队列，适合测试。"],
  ["BrowserLocalStorage", "KeyValueStorage", "持久化身份；不可用时自动退回内存。"],
  ["MemoryKeyValueStorage", "KeyValueStorage", "只在内存中保存身份，适合测试和非浏览器环境。"],
  ["JsonCodec", "Codec", "默认 JSON EventBatch 编码。"],
  ["ProtobufCodec", "Codec", "接收外部生成的 Protobuf 编码函数，核心不绑定 Runtime。"],
  ["NoCompression", "Compression", "默认不压缩。"],
  ["GzipCompression", "Compression", "使用浏览器 CompressionStream 生成 gzip。"],
] as const;

const advanced = [
  ["BrowserDeliveryLock", "DeliveryLock", "通过 Web Locks 协调同源多 Tab；Analytics 默认自动创建。"],
  ["ConsentManager", "class", "底层 Consent 状态机；普通接入使用 Analytics.getConsent/setConsent。"],
  ["IdentityManager", "class", "底层匿名、用户和 Session 身份管理；普通接入使用 identify/reset。"],
  ["estimateBrowserStorage", "function", "读取整个 Origin 的近似存储用量与配额。"],
  ["isStorageQuotaExceededError", "function", "在自定义存储实现中统一判断浏览器配额错误。"],
  ["StorageQuotaExceededError", "Error", "IndexedDbEventStorage 写入空间不足时使用的标准错误。"],
  ["createId", "function", "生成事件或自定义 Adapter 可用的 UUID 风格标识。"],
  ["SDK_NAME / SDK_VERSION", "constants", "读取运行中 SDK 的包名与版本。"],
] as const;

const plugins = [
  ["createAutoCapturePlugin(options)", "自动采集 SPA 导航、window.error 和 unhandledrejection。"],
  ["redactPlugin(blockedKeys)", "事件持久化前移除指定的顶层 Property。"],
  ["samplingPlugin(rates)", "按事件名设置 0 到 1 的客户端采样率。"],
] as const;

const diagnostics = [
  "sdk_initialized",
  "event_enqueued",
  "event_dropped",
  "storage_quota_exceeded",
  "flush_started",
  "flush_succeeded",
  "flush_failed",
  "flush_retry_scheduled",
  "sdk_shutdown",
] as const;

const englishMethods = [
  ["init()", "Promise<void>", "Initializes plugins, lifecycle listeners and scheduled flushes; safe to call repeatedly."],
  ["track(name, properties, options?)", "Promise<void>", "Records a typed product event and initializes the client when necessary."],
  ["page(name, properties?)", "Promise<void>", "Records a page event for page or route semantics."],
  ["identify(userId, traits?)", "Promise<void>", "Associates a signed-in user and records an $identify event."],
  ["getConsent()", "ConsentState", "Reads the current in-memory consent state."],
  ["setConsent(state)", "Promise<void>", "Updates consent; denied clears the queue and identity by default."],
  ["reset()", "void", "Clears the user association and rotates anonymous and session IDs."],
  ["getStorageEstimate()", "Promise<StorageEstimate | undefined>", "Reads the browser's origin-wide storage usage and quota estimate."],
  ["getQueueSnapshot()", "Promise<QueueSnapshot>", "Reads an immutable snapshot of queue depth, the oldest event timestamp and current delivery state."],
  ["subscribeDiagnostics(listener)", "() => void", "Subscribes at runtime and returns an idempotent unsubscribe function."],
  ["flush(reason?)", "Promise<void>", "Immediately attempts one batch; concurrent calls on one instance are coalesced."],
  ["shutdown()", "Promise<void>", "Performs a final flush, removes listeners and tears down plugins in reverse order."],
] as const;

const englishAdapters = [
  ["HttpTransport", "Transport", "POSTs encoded batches with timeout, Retry-After and keepalive support."],
  ["ConsoleTransport", "Transport", "Writes encoded batches to the console for local development."],
  ["EventRouter", "TransportResolver", "Selects a Transport per event; first match wins and unmatched events use the fallback."],
  ["IndexedDbEventStorage", "EventStorage", "Persistent browser FIFO queue recommended for production."],
  ["createBrowserEventStorage", "function", "Probes IndexedDB at startup and returns an explicit memory or custom fallback when it cannot open."],
  ["MemoryEventStorage", "EventStorage", "Non-persistent queue suitable for tests."],
  ["BrowserLocalStorage", "KeyValueStorage", "Persists identity and falls back to memory when unavailable."],
  ["MemoryKeyValueStorage", "KeyValueStorage", "Keeps identity in memory for tests and non-browser environments."],
  ["JsonCodec", "Codec", "Default JSON EventBatch encoder."],
  ["ProtobufCodec", "Codec", "Accepts externally generated Protobuf encoding without coupling the core to a runtime."],
  ["NoCompression", "Compression", "Default pass-through compression strategy."],
  ["GzipCompression", "Compression", "Produces gzip with the browser CompressionStream API."],
] as const;

const englishAdvanced = [
  ["BrowserDeliveryLock", "DeliveryLock", "Coordinates same-origin tabs with Web Locks; Analytics creates it by default."],
  ["ConsentManager", "class", "Low-level consent state; regular integrations use Analytics.getConsent/setConsent."],
  ["IdentityManager", "class", "Low-level anonymous, user and session identity; regular integrations use identify/reset."],
  ["estimateBrowserStorage", "function", "Reads approximate storage usage and quota for the whole origin."],
  ["isStorageQuotaExceededError", "function", "Normalizes browser quota errors in a custom storage implementation."],
  ["StorageQuotaExceededError", "Error", "Standard error used when IndexedDbEventStorage runs out of space."],
  ["createId", "function", "Creates UUID-style identifiers for events or custom adapters."],
  ["SDK_NAME / SDK_VERSION", "constants", "Read the package name and version of the running SDK."],
] as const;

const englishPlugins = [
  ["createAutoCapturePlugin(options)", "Observes SPA navigation, window.error and unhandledrejection."],
  ["redactPlugin(blockedKeys)", "Removes selected top-level properties before persistence."],
  ["samplingPlugin(rates)", "Applies a client sampling rate from 0 to 1 per event name."],
] as const;

function ReferenceTable({
  columns,
  rows,
}: {
  columns: readonly string[];
  rows: ReadonlyArray<readonly string[]>;
}) {
  return (
    <div className="mt-5 overflow-x-auto rounded-xl border border-white/10 bg-black/15">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead className="bg-white/5 text-slate-300">
          <tr>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]} className="border-t border-white/8">
              {row.map((value, index) => (
                <td key={`${row[0]}-${index}`} className={index === 0 ? "font-mono text-emerald-300" : index === 1 ? "font-mono text-slate-300" : "text-slate-400"}>
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ApiReference({ embedded = false }: { embedded?: boolean }) {
  const en = useLocale() === "en";
  return (
    <section id="api-reference" className={embedded ? "" : "border-t border-white/8"}>
      <div className={embedded ? "" : "mx-auto max-w-7xl px-5 py-24 lg:px-8"}>
        {!embedded ? <div className="max-w-3xl">
          <span className="section-kicker">05 / API Reference</span>
          <h2>{en ? "Public API at a glance" : "公开 API 快速查询"}</h2>
          <p className="section-copy">{en ? <>Methods, built-in adapters, plugins and diagnostics commonly used by application code. Everything is exported from the <code>tracelet-browser</code> package root.</> : <>这里列出应用代码通常会直接使用的实例方法、内置 Adapter、插件和诊断事件。所有入口均从 <code>tracelet-browser</code> 根包导出。</>}</p>
        </div> : null}

        <div className={embedded ? "space-y-16" : "mt-14 space-y-16"}>
          <article id="api-client">
            <div className="manual-heading"><Braces className="size-5" /><h3>{en ? "Analytics instance methods" : "Analytics 实例方法"}</h3></div>
            <ReferenceTable columns={en ? ["Method", "Returns", "Behavior"] : ["方法", "返回值", "行为"]} rows={en ? englishMethods : methods} />
          </article>

          <article id="api-adapters">
            <div className="manual-heading"><Database className="size-5" /><h3>{en ? "Built-in adapters" : "内置 Adapter"}</h3></div>
            <ReferenceTable columns={en ? ["Export", "Contract", "Purpose"] : ["导出", "契约", "用途"]} rows={en ? englishAdapters : adapters} />
          </article>

          <article id="api-advanced">
            <div className="manual-heading"><Database className="size-5" /><h3>{en ? "Advanced objects and utilities" : "高级对象与工具"}</h3></div>
            <p className="manual-copy">{en ? <>These exports support custom adapters and tests. Most applications should use the higher-level <code>Analytics</code> methods described above.</> : <>这些导出主要用于自定义 Adapter 与测试。大多数应用应优先使用上方列出的 <code>Analytics</code> 高层方法。</>}</p>
            <ReferenceTable columns={en ? ["Export", "Kind", "Purpose"] : ["导出", "类别", "用途"]} rows={en ? englishAdvanced : advanced} />
          </article>

          <div className="grid gap-8 lg:grid-cols-2">
            <article id="api-plugins">
              <div className="manual-heading"><Puzzle className="size-5" /><h3>{en ? "Built-in plugins" : "内置插件"}</h3></div>
              <div className="mt-5 divide-y divide-white/8 rounded-xl border border-white/10 bg-black/15">
                {(en ? englishPlugins : plugins).map(([name, description]) => (
                  <div key={name} className="p-5">
                    <code className="text-sm text-emerald-300">{name}</code>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
                  </div>
                ))}
              </div>
            </article>

            <article id="api-diagnostics">
              <div className="manual-heading"><Network className="size-5" /><h3>DiagnosticEvent</h3></div>
              <p className="manual-copy">{en ? <>Receive events through <code>onDiagnostic</code> or <code>subscribeDiagnostics()</code>; neither creates a product event. Delivery events include an <code>attemptId</code> for correlation, while <code>getQueueSnapshot()</code> exposes the current phase.</> : <>可通过 <code>onDiagnostic</code> 或 <code>subscribeDiagnostics()</code> 接收，均不会产生业务埋点。投递事件包含可关联的 <code>attemptId</code>，<code>getQueueSnapshot()</code> 则提供当前阶段。</>}</p>
              <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {diagnostics.map((event) => (
                  <li key={event} className="rounded-lg border border-white/8 bg-black/15 px-4 py-3 font-mono text-xs text-slate-300">{event}</li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
