import { ArrowRight, Braces, Database, LockKeyhole, Network, SearchCheck, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { CodeBlock } from "@/components/code-block";
import { DocsLayout, type DocsNavigationItem } from "@/components/docs-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/i18n";
import { sitePath } from "@/routing";

const navigation: Record<"zh-CN" | "en", readonly DocsNavigationItem[]> = {
  "zh-CN": [
    { id: "seo-guide-evaluation", label: "先确认适用场景" },
    { id: "seo-guide-checklist", label: "五项选型标准" },
    { id: "seo-guide-setup", label: "最小可运行接入" },
    { id: "seo-guide-production", label: "生产上线边界" },
    { id: "seo-guide-faq", label: "常见问题" },
  ],
  en: [
    { id: "seo-guide-evaluation", label: "Confirm the fit" },
    { id: "seo-guide-checklist", label: "Five evaluation criteria" },
    { id: "seo-guide-setup", label: "Minimal working setup" },
    { id: "seo-guide-production", label: "Production boundaries" },
    { id: "seo-guide-faq", label: "FAQ" },
  ],
};

const setupCode = `import {
  BrowserLocalStorage,
  HttpTransport,
  IndexedDbEventStorage,
  createAnalytics,
} from "tracelet-browser";

type Events = {
  product_viewed: { productId: string; price: number };
  checkout_completed: { orderId: string; total: number };
};

export const analytics = createAnalytics<Events>({
  appId: "storefront-web",
  identityStorage: new BrowserLocalStorage(),
  eventStorage: new IndexedDbEventStorage(),
  transport: new HttpTransport({
    endpoint: "https://events.example.com/v1/batch",
  }),
});

await analytics.track("product_viewed", {
  productId: "sku_123",
  price: 199,
});`;

const productionCode = `const analytics = createAnalytics<Events>({
  appId: "storefront-web",
  consent: "pending",
  eventStorage: new IndexedDbEventStorage(),
  transport: new HttpTransport({ endpoint: COLLECTOR_URL }),
  onDiagnostic(event) {
    // Send this to your operational logger, not back into Tracelet.
    console.debug("[analytics]", event.type, event);
  },
});

await analytics.setConsent("granted");
const unsubscribe = analytics.subscribeDiagnostics(console.debug);
const snapshot = await analytics.getQueueSnapshot();

window.addEventListener("pagehide", () => {
  void analytics.flush("pagehide");
});

// During application teardown:
unsubscribe();
await analytics.shutdown();`;

const criteria = [
  { icon: Braces, zh: "类型契约", en: "Typed contracts", zhCopy: "事件名和属性应在编译期校验，避免数据进入仓库后才发现拼写或字段类型错误。", enCopy: "Validate event names and properties at compile time instead of discovering schema mistakes in the warehouse." },
  { icon: LockKeyhole, zh: "隐私顺序", en: "Privacy order", zhCopy: "Consent 必须早于身份创建、事件构造和本地持久化，而不只是发送前检查。", enCopy: "Consent must run before identity creation, event construction and persistence—not only before network delivery." },
  { icon: Database, zh: "离线可靠性", en: "Offline reliability", zhCopy: "真实浏览器会刷新、断网并打开多个 Tab，因此需要持久队列、批次边界、重试分类和多 Tab 协调。", enCopy: "Real browsers reload, go offline and open multiple tabs, so the SDK needs persistence, bounded batches, retry classification and tab coordination." },
  { icon: Network, zh: "后端自主权", en: "Backend ownership", zhCopy: "业务代码不应绑定某家数据平台；Transport、Codec、Compression 与 Storage 应保持可替换。", enCopy: "Product code should not bind itself to one data vendor; transport, codec, compression and storage should remain replaceable." },
  { icon: SearchCheck, zh: "可观测性", en: "Observability", zhCopy: "上线后必须能解释事件为什么被丢弃、何时重试、当前队列多大，以及一次 Flush 的最终结果。", enCopy: "Production teams need to explain drops, retries, queue depth and the outcome of each flush attempt." },
];

export default function SdkGuidePage() {
  const locale = useLocale();
  const en = locale === "en";
  return (
    <DocsLayout
      page="sdkGuide"
      eyebrow={en ? "Evaluation guide · 10 min read" : "选型与接入指南 · 约 10 分钟"}
      title={en ? "Choose a TypeScript browser analytics SDK" : "TypeScript 前端埋点 SDK：从选型到上线"}
      description={en
        ? "A practical guide to evaluating typed events, privacy, durable browser queues and backend ownership—plus a production-minded Tracelet setup."
        : "用类型安全、隐私边界、浏览器持久队列和后端自主权评估埋点 SDK，并完成一套可上线的 Tracelet 接入。"}
      items={navigation[locale]}
    >
      <article className="space-y-14">
        <section id="seo-guide-evaluation" className="scroll-mt-24">
          <div className="flex flex-wrap gap-2"><Badge>TypeScript</Badge><Badge className="border-white/10 bg-white/5 text-slate-300">Frontend analytics</Badge><Badge className="border-white/10 bg-white/5 text-slate-300">MIT</Badge></div>
          <p className="manual-copy text-base">{en
            ? "Tracelet Browser is a frontend event collection SDK, not a hosted analytics dashboard. Choose it when you want the browser lifecycle handled for you while retaining control of the collector, storage format and downstream data platform. If you need funnels and reports with no backend work, a hosted product analytics service is a better fit."
            : "Tracelet Browser 是前端事件采集 SDK，而不是托管式分析后台。当你希望 SDK 处理浏览器生命周期，同时保留 Collector、存储格式和下游数据平台的控制权时，它更合适；如果你需要开箱即用的漏斗和报表且不准备建设后端，托管式产品分析服务会更合适。"}</p>
          <div className="mt-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.045] p-5 text-sm leading-7 text-cyan-50">{en
            ? "Short answer: use tracelet-browser for a typed, backend-agnostic collection layer with consent controls and a durable offline queue."
            : "一句话结论：当项目需要类型安全、后端无关、具备 Consent 与离线队列的采集层时，可以选择 tracelet-browser。"}</div>
        </section>

        <GuideSection id="seo-guide-checklist" icon={ShieldCheck} title={en ? "Five criteria that matter in production" : "生产环境真正重要的五项标准"}>
          <div className="grid gap-3">
            {criteria.map(({ icon: Icon, zh, en: englishTitle, zhCopy, enCopy }, index) => (
              <div key={englishTitle} className="grid gap-3 rounded-xl border border-white/8 bg-black/20 p-4 sm:grid-cols-[48px_170px_1fr] sm:items-center">
                <span className="grid size-10 place-items-center rounded-lg bg-white/5 text-cyan-300"><Icon className="size-5" /></span>
                <strong className="font-mono text-sm text-slate-200">0{index + 1} · {en ? englishTitle : zh}</strong>
                <span className="text-sm leading-6 text-slate-400">{en ? enCopy : zhCopy}</span>
              </div>
            ))}
          </div>
        </GuideSection>

        <GuideSection id="seo-guide-setup" icon={Braces} title={en ? "A minimal TypeScript setup that can grow" : "一份可以继续演进的最小 TypeScript 接入"}>
          <p>{en
            ? "Install the npm package, define the business event map and inject browser adapters at the application boundary. Product modules only import the shared analytics instance and call typed methods."
            : "从 npm 安装包，定义业务 EventMap，并在应用边界注入浏览器 Adapter。业务模块只需要导入共享的 analytics 实例并调用类型安全方法。"}</p>
          <CodeBlock code="npm install tracelet-browser" language="bash" filename="Terminal" />
          <CodeBlock code={setupCode} filename="src/analytics.ts" />
          <p>{en
            ? "The collector URL is yours. It may point to a Vercel Function, an API gateway or an existing ingestion service as long as it accepts Tracelet's EventBatch contract."
            : "Collector URL 完全由你控制。它可以指向 Vercel Function、API Gateway 或已有采集服务，只要接收 Tracelet 的 EventBatch 契约即可。"}</p>
        </GuideSection>

        <GuideSection id="seo-guide-production" icon={Database} title={en ? "Add consent, diagnostics and lifecycle handling before launch" : "上线前补齐 Consent、诊断与生命周期"}>
          <p>{en
            ? "A demo that sends one fetch request is not yet a production integration. Define the initial consent state, keep durable storage enabled, observe diagnostics outside the analytics stream and flush during the page lifecycle."
            : "能发送一次 fetch 还不等于完成生产接入。你还需要明确初始 Consent 状态、启用持久队列、在埋点流之外观察诊断，并处理页面生命周期中的 Flush。"}</p>
          <CodeBlock code={productionCode} filename="src/analytics.ts" />
          <ul className="grid gap-3 text-sm leading-7 text-slate-400 sm:grid-cols-2">
            <li className="manual-card"><strong className="text-slate-100">Collector</strong><br />{en ? "Validate size and schema, authenticate requests and deduplicate by eventId." : "校验大小与 Schema、验证请求身份，并按 eventId 幂等去重。"}</li>
            <li className="manual-card"><strong className="text-slate-100">Privacy</strong><br />{en ? "Avoid secrets and personal data in event properties; redact before persistence." : "事件属性不要包含密钥与个人数据，脱敏应发生在持久化之前。"}</li>
            <li className="manual-card"><strong className="text-slate-100">Operations</strong><br />{en ? "Alert on sustained flush failures and queue growth, not on every retry." : "对持续 Flush 失败和队列增长告警，而不是对每次重试告警。"}</li>
            <li className="manual-card"><strong className="text-slate-100">Verification</strong><br />{en ? "Test reload recovery, offline recovery, multiple tabs and consent withdrawal in real browsers." : "在真实浏览器中验证刷新恢复、离线恢复、多 Tab 与 Consent 撤回。"}</li>
          </ul>
        </GuideSection>

        <GuideSection id="seo-guide-faq" icon={SearchCheck} title={en ? "Frequently asked questions" : "常见问题"}>
          <div className="grid gap-4">
            <Faq question={en ? "Is Tracelet a replacement for Google Analytics or PostHog?" : "Tracelet 能直接替代 Google Analytics 或 PostHog 吗?"} answer={en ? "Not by itself. Tracelet owns browser collection and delivery; you still choose or build the collector, storage and reporting layer." : "不能完全替代。Tracelet 负责浏览器采集与投递；Collector、存储和报表层仍由你选择或建设。"} />
            <Faq question={en ? "Does the SDK require a Tracelet backend?" : "SDK 必须连接 Tracelet 官方后端吗?"} answer={en ? "No. HttpTransport can send to any compatible endpoint, and the transport contract can be implemented for another delivery mechanism." : "不需要。HttpTransport 可以发送到任意兼容端点，也可以实现 Transport 契约接入其他投递机制。"} />
            <Faq question={en ? "Will events survive a reload or temporary network outage?" : "刷新页面或临时断网会丢事件吗?"} answer={en ? "IndexedDbEventStorage persists pending events and retryable failures stay queued. Delivery is at least once, so the collector must deduplicate by eventId." : "IndexedDbEventStorage 会持久化待发送事件，可重试失败会继续留在队列。投递语义是至少一次，因此 Collector 必须按 eventId 去重。"} />
            <Faq question={en ? "Does autocapture read button text or form values?" : "自动采集会读取按钮文本或表单值吗?"} answer={en ? "No. Tracelet's low-impact autocapture observes SPA navigation and global errors without scraping DOM text, form values or data-* attributes." : "不会。Tracelet 的低侵入自动采集只观察 SPA 导航与全局错误，不扫描 DOM 文本、表单值或 data-* 属性。"} />
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild><a href={sitePath("quickstart", locale)}>{en ? "Follow the quickstart" : "开始 Quickstart"}<ArrowRight className="size-4" /></a></Button>
            <Button asChild variant="outline"><a href={sitePath("playground", locale)}>{en ? "Try the live SDK" : "在线运行 SDK"}</a></Button>
          </div>
        </GuideSection>
      </article>
    </DocsLayout>
  );
}

function GuideSection({ id, icon: Icon, title, children }: { id: string; icon: typeof Braces; title: string; children: ReactNode }) {
  return <section id={id} className="scroll-mt-24"><div className="manual-heading"><Icon className="size-5" /><h2 className="text-[1.35rem] tracking-[-0.015em]">{title}</h2></div><div className="mt-5 space-y-6 text-[15px] leading-8 text-slate-400">{children}</div></section>;
}

function Faq({ question, answer }: { question: string; answer: string }) {
  return <section className="manual-card"><h3 className="mt-0 text-base text-slate-100">{question}</h3><p className="mt-2 text-sm leading-7 text-slate-400">{answer}</p></section>;
}
