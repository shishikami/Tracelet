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
import { useLocale } from "@/i18n";

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
  ["maxBatchBytes", "number", "262144", "Codec 编码后单批次的最大字节数"],
  ["maxQueueSize", "number", "2000", "本地队列的最大事件数"],
  ["maxEventBytes", "number", "65536", "插件处理后单事件的最大 JSON 字节数"],
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

const englishOptions = [
  ["appId", "string", "—", "Stable application identifier; required"],
  ["transport", "Transport", "—", "Sends encoded batches to your collector; required"],
  ["eventStorage", "EventStorage", "Memory", "Pending-event queue; use IndexedDB in production"],
  ["identityStorage", "KeyValueStorage", "Memory", "Stores anonymous, user and session identifiers"],
  ["plugins", "AnalyticsPlugin[]", "[]", "Autocapture, redaction, sampling and other extensions"],
  ["flushIntervalMs", "number", "5000", "Scheduled flush interval"],
  ["maxBatchSize", "number", "30", "Maximum events in one delivery attempt"],
  ["maxBatchBytes", "number", "262144", "Maximum encoded bytes in one batch"],
  ["maxQueueSize", "number", "2000", "Maximum events in the local queue"],
  ["maxEventBytes", "number", "65536", "Maximum JSON bytes after plugin processing"],
  ["sessionTimeoutMs", "number", "1800000", "Idle time before creating a new session"],
  ["deliveryLock", "DeliveryLock", "Web Locks", "Coordinates flushes across same-origin tabs"],
  ["pageLifecycle", "boolean", "true", "Attempts a final flush when the page is hidden or closed"],
  ["consent.initialState", "pending | granted | denied", "granted", "Consent state before the first event"],
  ["retry", "object", "Exponential", "Base delay, maximum delay and jitter"],
] as const;

const englishTroubleshooting = [
  ["The browser reports a CORS error", "Allow the site's origin, POST, Content-Type and X-Analytics-Event-Count in the collector's CORS policy."],
  ["The queue disappears after reload", "Use IndexedDbEventStorage explicitly; the default MemoryEventStorage is not persistent."],
  ["The collector receives duplicate events", "Tracelet delivers at least once, so the collector must deduplicate idempotently by eventId."],
  ["Automatic page events are missing", "Confirm init() was called and createAutoCapturePlugin({ pageViews: true }) is enabled."],
  ["Error events do not include a stack", "includeStack defaults to false; enable it only after reviewing the privacy implications."],
  ["Events never get delivered", "Check consent, the collector URL and CSP connect-src, then inspect onDiagnostic output."],
] as const;

const englishChecklist = [
  "Persist pending events with IndexedDbEventStorage",
  "Start consent as pending when required by your privacy policy",
  "Configure CORS, authentication, rate limits and eventId deduplication",
  "Exercise retries and onDiagnostic in a test environment",
  "Allow the collector origin in CSP connect-src",
  "Enable error stacks only after a privacy review",
] as const;

const englishNavigation = [
  ["Install and initialize", "manual-setup"], ["Core API", "manual-api"], ["Autocapture", "manual-autocapture"],
  ["Consent", "manual-consent"], ["Lifecycle", "manual-lifecycle"], ["Options", "manual-options"],
  ["Collector contract", "manual-collector"], ["Production checklist", "manual-production"], ["Troubleshooting", "manual-troubleshooting"],
] as const;

const englishCodeComments: ReadonlyArray<readonly [string, string]> = [
  ["建议在独立 analytics.ts 中创建并导出唯一实例。", "Create and export one shared instance from a dedicated analytics.ts module."],
  ["事件名和 Properties 都会在编译期检查。", "Event names and properties are checked at compile time."],
  ["捕获首次打开、pushState、replaceState和前进后退。", "Capture the initial load, History API navigation and back/forward."],
  ["Hash 可能包含 token，只有 Hash Router 项目才显式开启。", "Hashes can contain tokens; enable this only for hash routers."],
  ["捕获 window.error 和 unhandledrejection。", "Capture window.error and unhandledrejection."],
  ["默认不发送堆栈，避免路径或参数中包含敏感信息。", "Stacks are omitted by default to avoid leaking sensitive paths or parameters."],
  ["将 CMP 或隐私弹窗的结果同步给 SDK。", "Synchronize the CMP or privacy-dialog result with the SDK."],
  ["撤回授权会清理未发送队列和本地身份。", "Withdrawing consent clears pending events and local identity."],
  ["应用启动时初始化。重复调用 init() 是安全的。", "Initialize at application startup. Calling init() repeatedly is safe."],
  ["登录后关联用户；匿名 ID 会继续保留。", "Associate the user after sign-in; the anonymous ID remains available."],
  ["退出登录时轮换匿名 ID 和 Session ID。", "Rotate anonymous and session IDs at sign-out."],
  ["测试或关键跳转前可以主动发送队列。", "Flush explicitly in tests or before a critical navigation."],
  ["微前端卸载、测试结束或 HMR dispose 时释放监听器。", "Release listeners on micro-frontend unmount, test teardown or HMR dispose."],
  ["这里不会创建新的埋点，可安全接入自己的日志系统。", "This does not create another analytics event and can feed your logger."],
];

function codeForLocale(code: string, english: boolean): string {
  if (!english) return code;
  return englishCodeComments.reduce((result, [source, target]) => result.replace(source, target), code);
}

export function Manual() {
  const en = useLocale() === "en";
  const localizedOptions = en ? englishOptions : options;
  const localizedTroubleshooting = en ? englishTroubleshooting : troubleshooting;
  const localizedChecklist = en ? englishChecklist : productionChecklist;
  const localizedNavigation = en ? englishNavigation : manualNavigation;
  return (
    <section id="manual" className="border-t border-white/8 bg-white/[0.018]">
      <div className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
        <div className="max-w-3xl">
          <span className="section-kicker">04 / User manual</span>
          <h2>{en ? "From first install to production delivery" : "从第一次安装到生产投递"}</h2>
          <p className="section-copy">{en ? "Follow the guide in order. It covers client creation, typed events, autocapture, consent, application lifecycle and collector requirements." : "按顺序完成下面的步骤即可接入。示例覆盖实例创建、类型安全事件、自动采集、隐私授权、应用生命周期和 Collector 实现要求。"}</p>
        </div>

        <div className="mt-14 grid gap-12 lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav className="h-fit rounded-2xl border border-white/8 bg-black/20 p-4 lg:sticky lg:top-24" aria-label={en ? "User guide table of contents" : "用户手册目录"}>
            <p className="px-3 pb-3 font-mono text-xs uppercase tracking-[0.14em] text-slate-500">On this page</p>
            {localizedNavigation.map(([label, id]) => (
              <a key={id} className="block rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white" href={`#${id}`}>{label}</a>
            ))}
          </nav>

          <div className="min-w-0 space-y-20">
            <article id="manual-setup">
              <div className="manual-heading"><Plug className="size-5" /><h3>{en ? "1. Install and initialize" : "1. 安装与初始化"}</h3></div>
              <p className="manual-copy">{en ? <>After installing <code>tracelet-browser</code>, create one shared instance in its own module. In production, use IndexedDB for events and LocalStorage for identity.</> : <>安装 <code>tracelet-browser</code> 后，在独立模块中创建单例。生产环境推荐同时配置 IndexedDB 事件队列和 LocalStorage 身份存储。</>}</p>
              <div className="mt-6"><CodeBlock code={codeForLocale(setupCode, en)} filename="analytics.ts" /></div>
            </article>

            <article id="manual-api">
              <div className="manual-heading"><Braces className="size-5" /><h3>{en ? "2. Define events and call the core API" : "2. 定义事件并调用核心 API"}</h3></div>
              <p className="manual-copy">{en ? <>Define an EventMap so <code>track()</code> validates names and properties. Use <code>page()</code> for page semantics and <code>identify()</code> for signed-in users.</> : <>为业务事件定义 EventMap 后，<code>track()</code> 会检查事件名和属性。<code>page()</code> 用于页面语义，<code>identify()</code> 用于登录用户关联。</>}</p>
              <div className="mt-6"><CodeBlock code={codeForLocale(typedEventsCode, en)} filename="events.ts" /></div>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="manual-card"><Badge>track</Badge><h4>{en ? "Business facts" : "业务事实"}</h4><p>{en ? "Stable product actions such as orders, searches and bookmarks." : "下单、搜索、收藏等有稳定业务含义的事件。"}</p></div>
                <div className="manual-card"><Badge>page</Badge><h4>{en ? "Page views" : "页面访问"}</h4><p>{en ? "Views of traditional pages or SPA routes." : "传统页面或 SPA 路由对应的页面浏览。"}</p></div>
                <div className="manual-card"><Badge>identify</Badge><h4>{en ? "User association" : "用户关联"}</h4><p>{en ? "Associate a business user ID and non-sensitive traits after sign-in." : "登录成功后关联业务用户 ID 和非敏感 Traits。"}</p></div>
              </div>
            </article>

            <article id="manual-autocapture">
              <div className="manual-heading"><Bug className="size-5" /><h3>{en ? "3. Optional, low-impact autocapture" : "3. 可选的低侵入自动采集"}</h3></div>
              <p className="manual-copy">{en ? <>The plugin observes navigation and global errors only. It does not scan the DOM or read element text, form values or <code>data-*</code> attributes. Generated events still pass through consent, plugins and the durable queue.</> : <>自动采集插件只观察导航和全局错误，不扫描 DOM，也不读取元素文本、表单值或 <code>data-*</code> 属性。页面事件和错误事件仍会经过 Consent、用户插件与可靠队列。</>}</p>
              <div className="mt-6"><CodeBlock code={codeForLocale(autoCaptureCode, en)} filename="analytics.ts" /></div>
              <div className="mt-5 overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                  <thead className="bg-white/5 text-slate-300"><tr><th scope="col">{en ? "Source" : "来源"}</th><th scope="col">{en ? "Event" : "事件"}</th><th scope="col">{en ? "Default privacy behavior" : "默认隐私策略"}</th></tr></thead>
                  <tbody>
                    <tr className="border-t border-white/8"><td>{en ? "Initial load and SPA navigation" : "首次加载与 SPA 导航"}</td><td><code className="text-emerald-300">page</code></td><td className="text-slate-400">{en ? "Removes query/hash by default; hash routers opt in" : "默认移除 query/hash；Hash Router 可显式开启"}</td></tr>
                    <tr className="border-t border-white/8"><td>window.error</td><td><code className="text-emerald-300">$error</code></td><td className="text-slate-400">{en ? "Error type, message and filename without query parameters" : "错误类型、消息和去除查询参数的文件名"}</td></tr>
                    <tr className="border-t border-white/8"><td>unhandledrejection</td><td><code className="text-emerald-300">$unhandled_rejection</code></td><td className="text-slate-400">{en ? "Does not serialize arbitrary objects; omits stacks by default" : "不序列化任意对象，默认不包含堆栈"}</td></tr>
                  </tbody>
                </table>
              </div>
            </article>

            <article id="manual-consent">
              <div className="manual-heading"><ShieldCheck className="size-5" /><h3>{en ? "4. Consent-first integration" : "4. Consent 优先接入"}</h3></div>
              <p className="manual-copy">{en ? <>When a CMP or privacy dialog owns consent, start in <code>pending</code>. Identities and events—including autocapture—are created only after consent becomes <code>granted</code>.</> : <>如果授权由 CMP 或隐私弹窗管理，请从 <code>pending</code> 开始。只有 <code>granted</code> 状态才会创建身份和事件，包括自动采集事件。</>}</p>
              <div className="mt-6"><CodeBlock code={codeForLocale(consentCode, en)} filename="consent.ts" /></div>
            </article>

            <article id="manual-lifecycle">
              <div className="manual-heading"><BookOpen className="size-5" /><h3>{en ? "5. Identity and application lifecycle" : "5. 身份和应用生命周期"}</h3></div>
              <p className="manual-copy">{en ? <>The SDK maintains anonymous and session IDs. A session rotates after 30 idle minutes; call <code>reset()</code> when a user signs out.</> : <>SDK 会自动维护匿名 ID 与 Session。Session 连续 30 分钟没有事件后自动更新；用户退出登录时应调用 <code>reset()</code>。</>}</p>
              <div className="mt-6"><CodeBlock code={codeForLocale(lifecycleCode, en)} filename="app-lifecycle.ts" /></div>
            </article>

            <article id="manual-options">
              <div className="manual-heading"><Gauge className="size-5" /><h3>{en ? "6. Configuration reference" : "6. 配置参考"}</h3></div>
              <p className="manual-copy">{en ? "Only the application ID and transport are required; every other capability can be replaced for the target environment." : "核心只要求应用标识和 Transport，其余能力都可以按运行环境替换。"}</p>
              <div className="mt-6 overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <thead className="bg-white/5 text-slate-300"><tr><th scope="col">{en ? "Option" : "选项"}</th><th scope="col">{en ? "Type" : "类型"}</th><th scope="col">{en ? "Default" : "默认值"}</th><th scope="col">{en ? "Description" : "说明"}</th></tr></thead>
                  <tbody>{localizedOptions.map(([name, type, defaultValue, description]) => (
                    <tr key={name} className="border-t border-white/8"><td><code className="text-emerald-300">{name}</code></td><td>{type}</td><td>{defaultValue}</td><td className="text-slate-400">{description}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </article>

            <article id="manual-collector">
              <div className="manual-heading"><Server className="size-5" /><h3>{en ? "7. Collector contract" : "7. 服务端接收契约"}</h3></div>
              <p className="manual-copy">{en ? <>The default JSON codec sends an EventBatch. Any 2xx succeeds; 408, 429 and 5xx responses keep the queue for retry. The collector should authenticate, validate size and deduplicate by <code>eventId</code>.</> : <>默认 JSON Codec 提交一个 EventBatch。任意 2xx 表示成功；408、429 和 5xx 会保留队列并重试。服务端应鉴权、校验大小，并按 <code>eventId</code> 幂等去重。</>}</p>
              <div className="mt-6"><CodeBlock code={collectorCode} language="http" filename="collector.http" /></div>
              <div className="mt-5 flex gap-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-4 text-sm leading-6 text-amber-100/80"><AlertTriangle className="mt-0.5 size-5 shrink-0" /><p>{en ? "Tracelet delivers at least once. A timeout may occur after the collector accepted a request, so deduplication is a correctness requirement—not an optional optimization." : "Tracelet 是至少一次投递。超时边界可能造成服务端已经接收、客户端仍然重试，因此去重不是可选优化。"}</p></div>
            </article>

            <article id="manual-production">
              <div className="manual-heading"><CheckCircle2 className="size-5" /><h3>{en ? "8. Diagnostics and production checklist" : "8. 诊断与上线清单"}</h3></div>
              <p className="manual-copy">{en ? <><code>onDiagnostic</code> observes SDK state without creating product events. Exercise network failures and 429 responses before production.</> : <><code>onDiagnostic</code> 观察 SDK 状态，但不会创建业务事件。建议先在测试环境模拟网络失败和 429，再投入生产。</>}</p>
              <div className="mt-6"><CodeBlock code={codeForLocale(diagnosticCode, en)} filename="diagnostics.ts" /></div>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {localizedChecklist.map((item) => <li key={item} className="flex gap-3 rounded-xl border border-white/8 bg-black/15 p-4 text-sm leading-6 text-slate-300"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" />{item}</li>)}
              </ul>
            </article>

            <article id="manual-troubleshooting">
              <div className="manual-heading"><Wrench className="size-5" /><h3>{en ? "Troubleshooting" : "故障排查"}</h3></div>
              <div className="mt-5 divide-y divide-white/8 rounded-xl border border-white/10">
                {localizedTroubleshooting.map(([problem, answer]) => <details key={problem} className="group p-5"><summary className="cursor-pointer font-medium text-slate-200">{problem}</summary><p className="mt-3 text-sm leading-7 text-slate-400">{answer}</p></details>)}
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
