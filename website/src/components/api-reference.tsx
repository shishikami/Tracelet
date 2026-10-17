import { Braces, Database, Network, Puzzle } from "lucide-react";

const methods = [
  ["init()", "Promise<void>", "初始化插件、页面生命周期监听和定时 Flush；重复调用安全。"],
  ["track(name, properties, options?)", "Promise<void>", "记录类型安全的业务事件；未初始化时会自动初始化。"],
  ["page(name, properties?)", "Promise<void>", "记录 page 类型事件，适合页面或路由语义。"],
  ["identify(userId, traits?)", "Promise<void>", "关联登录用户并记录 $identify 事件。"],
  ["getConsent()", "ConsentState", "读取当前内存中的 Consent 状态。"],
  ["setConsent(state)", "Promise<void>", "更新 Consent；denied 默认清空队列和身份。"],
  ["reset()", "void", "清除用户关联并轮换匿名 ID 与 Session ID。"],
  ["flush(reason?)", "Promise<void>", "立即尝试发送一个批次；同实例并发调用会合并。"],
  ["shutdown()", "Promise<void>", "最后 Flush，移除监听器并按逆序销毁插件。"],
] as const;

const adapters = [
  ["HttpTransport", "Transport", "通过 fetch 向 Collector POST 批次；支持超时、Retry-After 和 keepalive。"],
  ["ConsoleTransport", "Transport", "把编码批次输出到控制台，适合本地调试。"],
  ["IndexedDbEventStorage", "EventStorage", "浏览器持久化 FIFO 队列，生产环境推荐。"],
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
  "flush_started",
  "flush_succeeded",
  "flush_failed",
  "flush_retry_scheduled",
  "sdk_shutdown",
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
  return (
    <section id="api-reference" className="border-t border-white/8">
      <div className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
        <div className="max-w-3xl">
          <span className="section-kicker">05 / API Reference</span>
          <h2>公开 API 快速查询</h2>
          <p className="section-copy">这里列出应用代码通常会直接使用的实例方法、内置 Adapter、插件和诊断事件。所有入口均从 <code>tracelet-browser</code> 根包导出。</p>
        </div>

        <div className="mt-14 space-y-16">
          <article id="api-client">
            <div className="manual-heading"><Braces className="size-5" /><h3>Analytics 实例方法</h3></div>
            <ReferenceTable columns={["方法", "返回值", "行为"]} rows={methods} />
          </article>

          <article id="api-adapters">
            <div className="manual-heading"><Database className="size-5" /><h3>内置 Adapter</h3></div>
            <ReferenceTable columns={["导出", "契约", "用途"]} rows={adapters} />
          </article>

          <div className="grid gap-8 lg:grid-cols-2">
            <article id="api-plugins">
              <div className="manual-heading"><Puzzle className="size-5" /><h3>内置插件</h3></div>
              <div className="mt-5 divide-y divide-white/8 rounded-xl border border-white/10 bg-black/15">
                {plugins.map(([name, description]) => (
                  <div key={name} className="p-5">
                    <code className="text-sm text-emerald-300">{name}</code>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
                  </div>
                ))}
              </div>
            </article>

            <article id="api-diagnostics">
              <div className="manual-heading"><Network className="size-5" /><h3>DiagnosticEvent</h3></div>
              <p className="manual-copy">通过 <code>onDiagnostic</code> 接收，不会产生新的业务埋点。</p>
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
