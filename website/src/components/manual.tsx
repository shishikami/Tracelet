import {
  AlertTriangle,
  BookOpen,
  Braces,
  Bug,
  CheckCircle2,
  Gauge,
  Plug,
  Server,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import { Badge } from "@/components/ui/badge";

const setupCode = `import {
  BrowserLocalStorage,
  HttpTransport,
  IndexedDbEventStorage,
  createAnalytics,
} from "tracelet-browser";

// 建议在独立 analytics.ts 中创建并导出唯一实例。
export const analytics = createAnalytics({
  appId: "commerce-web",
  environment: import.meta.env.MODE,
  identityStorage: new BrowserLocalStorage(),
  eventStorage: new IndexedDbEventStorage({
    databaseName: "commerce-analytics",
  }),
  transport: new HttpTransport({
    endpoint: "https://events.example.com/v1/batch",
  }),
});

await analytics.init();`;

const typedEventsCode = `interface AppEvents {
  product_viewed: {
    productId: string;
    category?: string;
  };
  order_submitted: {
    orderId: string;
    amount: number;
    currency: "CNY" | "USD";
  };
}

const analytics = createAnalytics<AppEvents>({
  appId: "commerce-web",
  transport,
});

// 事件名和 Properties 都会在编译期检查。
await analytics.track("order_submitted", {
  orderId: "o_456",
  amount: 199,
  currency: "CNY",
});

await analytics.page("Product detail", { productId: "sku_123" });
await analytics.identify("user_42", { plan: "pro" });`;

const autoCaptureCode = `import {
  createAnalytics,
  createAutoCapturePlugin,
} from "tracelet-browser";

const analytics = createAnalytics({
  appId: "commerce-web",
  transport,
  plugins: [
    createAutoCapturePlugin({
      // 捕获首次打开、pushState、replaceState和前进后退。
      pageViews: {
        initial: true,
        // Hash 可能包含 token，只有 Hash Router 项目才显式开启。
        includeHash: false,
      },
      // 捕获 window.error 和 unhandledrejection。
      errors: {
        // 默认不发送堆栈，避免路径或参数中包含敏感信息。
        includeStack: false,
      },
    }),
  ],
});

await analytics.init();`;

const consentCode = `const analytics = createAnalytics({
  appId: "commerce-web",
  transport,
  consent: {
    initialState: "pending",
    clearQueueOnDenied: true,
  },
});

await analytics.init();

// 将 CMP 或隐私弹窗的结果同步给 SDK。
await analytics.setConsent("granted");
await analytics.track("product_viewed", { productId: "sku_123" });

// 撤回授权会清理未发送队列和本地身份。
await analytics.setConsent("denied");`;

const lifecycleCode = `// 应用启动时初始化。重复调用 init() 是安全的。
await analytics.init();

// 登录后关联用户；匿名 ID 会继续保留。
await analytics.identify("user_42", { plan: "pro" });

// 退出登录时轮换匿名 ID 和 Session ID。
analytics.reset();

// 测试或关键跳转前可以主动发送队列。
await analytics.flush();

// 微前端卸载、测试结束或 HMR dispose 时释放监听器。
await analytics.shutdown();`;

const diagnosticCode = `const analytics = createAnalytics({
  appId: "commerce-web",
  transport,
  onDiagnostic(event) {
    // 这里不会创建新的埋点，可安全接入自己的日志系统。
    if (event.type === "flush_failed") {
      console.warn("Tracelet delivery failed", event);
    }
  },
});`;

const collectorCode = `POST /v1/batch
Content-Type: application/json
X-Analytics-Event-Count: 2

{
  "protocolVersion": "1",
  "sentAt": "2026-10-17T08:00:00.000Z",
  "events": [
    {
      "eventId": "evt_...",
      "type": "track",
      "name": "product_viewed",
      "properties": { "productId": "sku_123" }
    }
  ]
}

HTTP/1.1 202 Accepted`;

const options = [
  ["appId", "string", "—", "应用的稳定标识，必填"],
  ["transport", "Transport", "—", "把编码后的批次发送到后端，必填"],
  ["eventStorage", "EventStorage", "Memory", "未发送事件队列；生产环境推荐 IndexedDB"],
  ["identityStorage", "KeyValueStorage", "Memory", "匿名 ID、用户 ID 和 Session ID 的存储"],
  ["plugins", "AnalyticsPlugin[]", "[]", "自动采集、脱敏、采样等扩展"],
  ["flushIntervalMs", "number", "5000", "定时 Flush 间隔"],
  ["maxBatchSize", "number", "30", "单次投递的最大事件数"],
  ["maxQueueSize", "number", "2000", "本地队列的最大事件数"],
  ["sessionTimeoutMs", "number", "1800000", "连续无事件多久后创建新 Session"],
  ["deliveryLock", "DeliveryLock", "Web Locks", "协调同源多 Tab 对共享队列的 Flush"],
  ["pageLifecycle", "boolean", "true", "页面隐藏或退出时尝试最后一次 Flush"],
  ["consent.initialState", "pending | granted | denied", "granted", "首次采集前的授权状态"],
  ["retry", "object", "指数退避", "基础延迟、最大延迟和随机抖动"],
] as const;

const troubleshooting = [
  ["浏览器出现 CORS 错误", "在 Collector 允许站点 Origin、POST、Content-Type 和 X-Analytics-Event-Count 请求头。"],
  ["刷新页面后队列消失", "显式使用 IndexedDbEventStorage；默认 MemoryEventStorage 不持久化。"],
  ["事件被重复接收", "Tracelet 使用至少一次投递；服务端必须按照 eventId 幂等去重。"],
  ["自动页面事件没有出现", "确认已调用 init()，并启用了 createAutoCapturePlugin({ pageViews: true })。"],
  ["错误事件没有堆栈", "includeStack 默认为 false；确认隐私风险后才能显式开启。"],
  ["事件一直没有发送", "检查 Consent、Collector 地址、CSP connect-src，并观察 onDiagnostic 输出。"],
] as const;

const productionChecklist = [
  "使用 IndexedDbEventStorage 持久化未发送事件",
  "根据隐私要求把 Consent 初始状态设为 pending",
  "在 Collector 配置 CORS、鉴权、限流与 eventId 去重",
  "在测试环境观察 onDiagnostic 和失败重试",
  "确认 CSP 的 connect-src 允许 Collector 域名",
  "只在评估隐私风险后开启错误堆栈",
] as const;

const manualNavigation = [
  ["安装与初始化", "manual-setup"],
  ["核心 API", "manual-api"],
  ["自动采集", "manual-autocapture"],
  ["Consent", "manual-consent"],
  ["生命周期", "manual-lifecycle"],
  ["配置参考", "manual-options"],
  ["服务端契约", "manual-collector"],
  ["诊断与上线", "manual-production"],
  ["故障排查", "manual-troubleshooting"],
] as const;

export function Manual() {
  return (
    <section id="manual" className="border-t border-white/8 bg-white/[0.018]">
      <div className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
        <div className="max-w-3xl">
          <span className="section-kicker">04 / User manual</span>
          <h2>从第一次安装到生产投递</h2>
          <p className="section-copy">按顺序完成下面的步骤即可接入。示例覆盖实例创建、类型安全事件、自动采集、隐私授权、应用生命周期和 Collector 实现要求。</p>
        </div>

        <div className="mt-14 grid gap-12 lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav className="h-fit rounded-2xl border border-white/8 bg-black/20 p-4 lg:sticky lg:top-24" aria-label="用户手册目录">
            <p className="px-3 pb-3 font-mono text-xs uppercase tracking-[0.14em] text-slate-500">On this page</p>
            {manualNavigation.map(([label, id]) => (
              <a key={id} className="block rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white" href={`#${id}`}>{label}</a>
            ))}
          </nav>

          <div className="min-w-0 space-y-20">
            <article id="manual-setup">
              <div className="manual-heading"><Plug className="size-5" /><h3>1. 安装与初始化</h3></div>
              <p className="manual-copy">安装 <code>tracelet-browser</code> 后，在独立模块中创建单例。生产环境推荐同时配置 IndexedDB 事件队列和 LocalStorage 身份存储。</p>
              <div className="mt-6"><CodeBlock code={setupCode} /></div>
            </article>

            <article id="manual-api">
              <div className="manual-heading"><Braces className="size-5" /><h3>2. 定义事件并调用核心 API</h3></div>
              <p className="manual-copy">为业务事件定义 EventMap 后，<code>track()</code> 会检查事件名和属性。<code>page()</code> 用于页面语义，<code>identify()</code> 用于登录用户关联。</p>
              <div className="mt-6"><CodeBlock code={typedEventsCode} /></div>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="manual-card"><Badge>track</Badge><h4>业务事实</h4><p>下单、搜索、收藏等有稳定业务含义的事件。</p></div>
                <div className="manual-card"><Badge>page</Badge><h4>页面访问</h4><p>传统页面或 SPA 路由对应的页面浏览。</p></div>
                <div className="manual-card"><Badge>identify</Badge><h4>用户关联</h4><p>登录成功后关联业务用户 ID 和非敏感 Traits。</p></div>
              </div>
            </article>

            <article id="manual-autocapture">
              <div className="manual-heading"><Bug className="size-5" /><h3>3. 可选的低侵入自动采集</h3></div>
              <p className="manual-copy">自动采集插件只观察导航和全局错误，不扫描 DOM，也不读取元素文本、表单值或 <code>data-*</code> 属性。页面事件和错误事件仍会经过 Consent、用户插件与可靠队列。</p>
              <div className="mt-6"><CodeBlock code={autoCaptureCode} /></div>
              <div className="mt-5 overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                  <thead className="bg-white/5 text-slate-300"><tr><th scope="col">来源</th><th scope="col">事件</th><th scope="col">默认隐私策略</th></tr></thead>
                  <tbody>
                    <tr className="border-t border-white/8"><td>首次加载与 SPA 导航</td><td><code className="text-emerald-300">page</code></td><td className="text-slate-400">默认移除 query/hash；Hash Router 可显式开启</td></tr>
                    <tr className="border-t border-white/8"><td>window.error</td><td><code className="text-emerald-300">$error</code></td><td className="text-slate-400">错误类型、消息和去除查询参数的文件名</td></tr>
                    <tr className="border-t border-white/8"><td>unhandledrejection</td><td><code className="text-emerald-300">$unhandled_rejection</code></td><td className="text-slate-400">不序列化任意对象，默认不包含堆栈</td></tr>
                  </tbody>
                </table>
              </div>
            </article>

            <article id="manual-consent">
              <div className="manual-heading"><ShieldCheck className="size-5" /><h3>4. Consent 优先接入</h3></div>
              <p className="manual-copy">如果授权由 CMP 或隐私弹窗管理，请从 <code>pending</code> 开始。只有 <code>granted</code> 状态才会创建身份和事件，包括自动采集事件。</p>
              <div className="mt-6"><CodeBlock code={consentCode} /></div>
            </article>

            <article id="manual-lifecycle">
              <div className="manual-heading"><BookOpen className="size-5" /><h3>5. 身份和应用生命周期</h3></div>
              <p className="manual-copy">SDK 会自动维护匿名 ID 与 Session。Session 连续 30 分钟没有事件后自动更新；用户退出登录时应调用 <code>reset()</code>。</p>
              <div className="mt-6"><CodeBlock code={lifecycleCode} /></div>
            </article>

            <article id="manual-options">
              <div className="manual-heading"><Gauge className="size-5" /><h3>6. 配置参考</h3></div>
              <p className="manual-copy">核心只要求应用标识和 Transport，其余能力都可以按运行环境替换。</p>
              <div className="mt-6 overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <thead className="bg-white/5 text-slate-300"><tr><th scope="col">选项</th><th scope="col">类型</th><th scope="col">默认值</th><th scope="col">说明</th></tr></thead>
                  <tbody>{options.map(([name, type, defaultValue, description]) => (
                    <tr key={name} className="border-t border-white/8"><td><code className="text-emerald-300">{name}</code></td><td>{type}</td><td>{defaultValue}</td><td className="text-slate-400">{description}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </article>

            <article id="manual-collector">
              <div className="manual-heading"><Server className="size-5" /><h3>7. 服务端接收契约</h3></div>
              <p className="manual-copy">默认 JSON Codec 提交一个 EventBatch。任意 2xx 表示成功；408、429 和 5xx 会保留队列并重试。服务端应鉴权、校验大小，并按 <code>eventId</code> 幂等去重。</p>
              <div className="mt-6"><CodeBlock code={collectorCode} language="http" /></div>
              <div className="mt-5 flex gap-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-4 text-sm leading-6 text-amber-100/80"><AlertTriangle className="mt-0.5 size-5 shrink-0" /><p>Tracelet 是至少一次投递。超时边界可能造成服务端已经接收、客户端仍然重试，因此去重不是可选优化。</p></div>
            </article>

            <article id="manual-production">
              <div className="manual-heading"><CheckCircle2 className="size-5" /><h3>8. 诊断与上线清单</h3></div>
              <p className="manual-copy"><code>onDiagnostic</code> 观察 SDK 状态，但不会创建业务事件。建议先在测试环境模拟网络失败和 429，再投入生产。</p>
              <div className="mt-6"><CodeBlock code={diagnosticCode} /></div>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {productionChecklist.map((item) => <li key={item} className="flex gap-3 rounded-xl border border-white/8 bg-black/15 p-4 text-sm leading-6 text-slate-300"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" />{item}</li>)}
              </ul>
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
