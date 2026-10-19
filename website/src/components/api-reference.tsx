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
  ["flush(reason?)", "Promise<void>", "立即尝试发送一个批次；同实例并发调用会合并。"],
  ["shutdown()", "Promise<void>", "最后 Flush，移除监听器并按逆序销毁插件。"],
] as const;

const adapters = [
  ["HttpTransport", "Transport", "通过 fetch 向 Collector POST 批次；支持超时、Retry-After 和 keepalive。"],
  ["ConsoleTransport", "Transport", "把编码批次输出到控制台，适合本地调试。"],
  ["EventRouter", "TransportResolver", "按事件条件选择 Transport；首条匹配规则优先，未匹配事件进入 fallback。"],
  ["IndexedDbEventStorage", "EventStorage", "浏览器持久化 FIFO 队列，生产环境推荐。"],
  ["estimateBrowserStorage", "function", "读取整个 Origin 的近似用量、配额、可用空间与持久化状态。"],
  ["MemoryEventStorage", "EventStorage", "刷新即丢失的内存队列，适合测试。"],
  ["BrowserLocalStorage", "KeyValueStorage", "持久化身份；不可用时自动退回内存。"],
  ["JsonCodec", "Codec", "默认 JSON EventBatch 编码。"],
  ["ProtobufCodec", "Codec", "接收外部生成的 Protobuf 编码函数，核心不绑定 Runtime。"],
  ["NoCompression", "Compression", "默认不压缩。"],
  ["GzipCompression", "Compression", "使用浏览器 CompressionStream 生成 gzip。"],
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
  ["flush(reason?)", "Promise<void>", "Immediately attempts one batch; concurrent calls on one instance are coalesced."],
  ["shutdown()", "Promise<void>", "Performs a final flush, removes listeners and tears down plugins in reverse order."],
] as const;

const englishAdapters = [
  ["HttpTransport", "Transport", "POSTs encoded batches with timeout, Retry-After and keepalive support."],
  ["ConsoleTransport", "Transport", "Writes encoded batches to the console for local development."],
  ["EventRouter", "TransportResolver", "Selects a Transport per event; first match wins and unmatched events use the fallback."],
  ["IndexedDbEventStorage", "EventStorage", "Persistent browser FIFO queue recommended for production."],
  ["estimateBrowserStorage", "function", "Reads approximate origin-wide usage, quota, available bytes and persistence state."],
  ["MemoryEventStorage", "EventStorage", "Non-persistent queue suitable for tests."],
  ["BrowserLocalStorage", "KeyValueStorage", "Persists identity and falls back to memory when unavailable."],
  ["JsonCodec", "Codec", "Default JSON EventBatch encoder."],
  ["ProtobufCodec", "Codec", "Accepts externally generated Protobuf encoding without coupling the core to a runtime."],
  ["NoCompression", "Compression", "Default pass-through compression strategy."],
  ["GzipCompression", "Compression", "Produces gzip with the browser CompressionStream API."],
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

export function ApiReference() {
  const en = useLocale() === "en";
  return (
    <section id="api-reference" className="border-t border-white/8">
      <div className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
        <div className="max-w-3xl">
          <span className="section-kicker">05 / API Reference</span>
          <h2>{en ? "Public API at a glance" : "公开 API 快速查询"}</h2>
          <p className="section-copy">{en ? <>Methods, built-in adapters, plugins and diagnostics commonly used by application code. Everything is exported from the <code>tracelet-browser</code> package root.</> : <>这里列出应用代码通常会直接使用的实例方法、内置 Adapter、插件和诊断事件。所有入口均从 <code>tracelet-browser</code> 根包导出。</>}</p>
        </div>

        <div className="mt-14 space-y-16">
          <article id="api-client">
            <div className="manual-heading"><Braces className="size-5" /><h3>{en ? "Analytics instance methods" : "Analytics 实例方法"}</h3></div>
            <ReferenceTable columns={en ? ["Method", "Returns", "Behavior"] : ["方法", "返回值", "行为"]} rows={en ? englishMethods : methods} />
          </article>

          <article id="api-adapters">
            <div className="manual-heading"><Database className="size-5" /><h3>{en ? "Built-in adapters" : "内置 Adapter"}</h3></div>
            <ReferenceTable columns={en ? ["Export", "Contract", "Purpose"] : ["导出", "契约", "用途"]} rows={en ? englishAdapters : adapters} />
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
              <p className="manual-copy">{en ? <>Received through <code>onDiagnostic</code>; never creates another product event. Flush events include the selected transport name.</> : <>通过 <code>onDiagnostic</code> 接收，不会产生新的业务埋点；Flush 事件会包含实际选中的 Transport 名称。</>}</p>
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
