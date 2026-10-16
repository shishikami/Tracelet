import { AlertTriangle, BookOpen, Braces, Server, ShieldCheck, Wrench } from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import { Badge } from "@/components/ui/badge";

const consentCode = `const analytics = createAnalytics({
  appId: "commerce-web",
  transport,
  consent: {
    initialState: "pending",
    clearQueueOnDenied: true,
  },
});

// 用户同意前，事件和身份都不会创建。
await analytics.setConsent("granted");
await analytics.track("product_viewed", { productId: "sku_123" });

// 用户撤回授权时清理队列和本地身份。
await analytics.setConsent("denied");`;

const collectorCode = `POST /v1/batch
Content-Type: application/json
X-Analytics-Event-Count: 2

{
  "protocolVersion": "1",
  "sentAt": "2026-10-17T08:00:00.000Z",
  "events": [{ "eventId": "...", "name": "product_viewed" }]
}

HTTP/1.1 202 Accepted`;

const options = [
  ["appId", "string", "—", "应用的稳定标识，必填"],
  ["transport", "Transport", "—", "负责把编码后的批次发送到后端，必填"],
  ["eventStorage", "EventStorage", "Memory", "未发送事件队列；生产环境推荐 IndexedDB"],
  ["identityStorage", "KeyValueStorage", "Memory", "匿名 ID、用户 ID 与 Session ID 的存储"],
  ["flushIntervalMs", "number", "5000", "定时 Flush 间隔"],
  ["maxBatchSize", "number", "30", "单次投递的最大事件数"],
  ["maxQueueSize", "number", "2000", "本地队列的最大事件数"],
  ["sessionTimeoutMs", "number", "1800000", "连续无事件多久后自动创建新 Session"],
  ["deliveryLock", "DeliveryLock", "Web Locks", "协调同源多 Tab 对共享队列的 Flush"],
  ["pageLifecycle", "boolean", "true", "页面隐藏或退出时尝试最后一次 Flush"],
  ["consent.initialState", "pending | granted | denied", "granted", "首次采集前的授权状态"],
  ["retry", "object", "指数退避", "基础延迟、最大延迟和随机抖动"],
] as const;

const troubleshooting = [
  ["浏览器出现 CORS 错误", "在 Collector 允许站点 Origin、POST、Content-Type 和自定义请求头。"],
  ["刷新页面后队列消失", "显式使用 IndexedDbEventStorage；默认 MemoryEventStorage 不持久化。"],
  ["事件被重复接收", "Tracelet 使用至少一次投递；服务端必须按照 eventId 幂等去重。"],
  ["gzip 无法使用", "目标浏览器可能不支持 CompressionStream；先使用 NoCompression 或提供自定义适配器。"],
  ["事件一直没有发送", "检查 Consent 状态、Collector 地址、CSP connect-src 和 onDiagnostic 输出。"],
] as const;

export function Manual() {
  return (
    <section id="manual" className="border-t border-white/8 bg-white/[0.018]">
      <div className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
        <div className="max-w-3xl">
          <span className="section-kicker">04 / User manual</span>
          <h2>从接入到生产投递</h2>
          <p className="section-copy">这里集中说明运行时配置、隐私授权、后端接收契约和常见故障。所有示例均以公开 npm 包为准。</p>
        </div>

        <div className="mt-14 grid gap-12 lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav className="h-fit rounded-2xl border border-white/8 bg-black/20 p-4 lg:sticky lg:top-24" aria-label="用户手册目录">
            <p className="px-3 pb-3 font-mono text-xs uppercase tracking-[0.14em] text-slate-500">On this page</p>
            {[
              ["配置参考", "manual-options"],
              ["Consent", "manual-consent"],
              ["服务端契约", "manual-collector"],
              ["投递语义", "manual-delivery"],
              ["故障排查", "manual-troubleshooting"],
            ].map(([label, id]) => <a key={id} className="block rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white" href={`#${id}`}>{label}</a>)}
          </nav>

          <div className="min-w-0 space-y-16">
            <article id="manual-options">
              <div className="manual-heading"><Braces className="size-5" /><h3>配置参考</h3></div>
              <p className="manual-copy">核心只要求应用标识和 Transport，其余能力都可以按运行环境替换。</p>
              <div className="mt-6 overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead className="bg-white/5 text-slate-300"><tr><th scope="col">选项</th><th scope="col">类型</th><th scope="col">默认值</th><th scope="col">说明</th></tr></thead>
                  <tbody>{options.map(([name, type, defaultValue, description]) => (
                    <tr key={name} className="border-t border-white/8"><td><code className="text-emerald-300">{name}</code></td><td>{type}</td><td>{defaultValue}</td><td className="text-slate-400">{description}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </article>

            <article id="manual-consent">
              <div className="manual-heading"><ShieldCheck className="size-5" /><h3>Consent 优先接入</h3></div>
              <p className="manual-copy">如果授权由 CMP 或前端弹窗管理，请从 pending 开始。只有 granted 状态才会创建身份和事件。</p>
              <div className="mt-6"><CodeBlock code={consentCode} /></div>
            </article>

            <article id="manual-collector">
              <div className="manual-heading"><Server className="size-5" /><h3>服务端接收契约</h3></div>
              <p className="manual-copy">默认 JSON Codec 会提交一个 EventBatch。服务端返回任意 2xx 表示接收成功；408、429 和 5xx 会保留队列并重试。同源多 Tab 默认通过 Web Locks 协调共享队列。</p>
              <div className="mt-6"><CodeBlock code={collectorCode} language="http" /></div>
            </article>

            <article id="manual-delivery">
              <div className="manual-heading"><BookOpen className="size-5" /><h3>投递语义</h3></div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="manual-card"><Badge>Retry</Badge><h4>会重试</h4><p>网络错误、客户端超时、HTTP 408、429、5xx，以及编码或存储过程中的临时异常。</p></div>
                <div className="manual-card"><Badge>Drop</Badge><h4>不会重试</h4><p>普通 HTTP 4xx 和调用方明确取消。不可重试响应会从队列移除，避免永久阻塞。</p></div>
              </div>
              <div className="mt-4 flex gap-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-4 text-sm leading-6 text-amber-100/80"><AlertTriangle className="mt-0.5 size-5 shrink-0" /><p>投递语义为至少一次。超时边界可能造成服务端已经接收、客户端仍然重试，因此必须按 <code>eventId</code> 去重。</p></div>
            </article>

            <article id="manual-troubleshooting">
              <div className="manual-heading"><Wrench className="size-5" /><h3>故障排查</h3></div>
              <div className="mt-5 divide-y divide-white/8 rounded-xl border border-white/10">
                {troubleshooting.map(([problem, answer]) => <details key={problem} className="group p-5"><summary className="cursor-pointer font-medium text-slate-200">{problem}</summary><p className="mt-3 text-sm leading-7 text-slate-400">{answer}</p></details>)}
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
