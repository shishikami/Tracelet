import { ArrowRight, Boxes, Braces, Database, LockKeyhole, Network, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { CodeBlock } from "@/components/code-block";
import { DocsLayout, type DocsNavigationItem } from "@/components/docs-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/i18n";
import { sitePath } from "@/routing";

const navigation: Record<"zh-CN" | "en", readonly DocsNavigationItem[]> = {
  "zh-CN": [
    { id: "guide-architecture", label: "问题与目标" },
    { id: "guide-contracts", label: "稳定契约" },
    { id: "guide-delivery", label: "可靠投递" },
    { id: "guide-privacy", label: "隐私边界" },
    { id: "guide-codec", label: "Codec 与 Protobuf" },
    { id: "guide-checklist", label: "落地清单" },
  ],
  en: [
    { id: "guide-architecture", label: "Problem and goal" },
    { id: "guide-contracts", label: "Stable contracts" },
    { id: "guide-delivery", label: "Reliable delivery" },
    { id: "guide-privacy", label: "Privacy boundary" },
    { id: "guide-codec", label: "Codecs and Protobuf" },
    { id: "guide-checklist", label: "Implementation checklist" },
  ],
};

const contractCode = `export interface Transport {
  readonly name: string;
  send(batch: EncodedBatch, context: TransportContext):
    Promise<TransportResult>;
}

export interface EventStorage {
  push(event: AnalyticsEvent): Promise<void>;
  peek(limit: number): Promise<AnalyticsEvent[]>;
  remove(eventIds: readonly string[]): Promise<void>;
  size(): Promise<number>;
  clear(): Promise<void>;
}

export interface Codec {
  readonly name: string;
  readonly contentType: string;
  encode(batch: EventBatch): Promise<string | Uint8Array>;
}`;

const setupCode = `const analytics = createAnalytics({
  appId: "storefront",
  eventStorage: new IndexedDbEventStorage(),
  codec: new JsonCodec(),
  compression: new GzipCompression(),
  transport: new HttpTransport({
    endpoint: "https://events.example.com/v1/batch",
  }),
});`;

const layers = [
  { icon: Braces, label: "Public API", zh: "业务代码只调用 track、page 与 identify。", en: "Product code only calls track, page and identify." },
  { icon: ShieldCheck, label: "Policy", zh: "Consent、插件与大小限制决定事件是否可以进入队列。", en: "Consent, plugins and size limits decide whether an event may enter the queue." },
  { icon: Database, label: "Durability", zh: "Storage 负责 FIFO、刷新恢复与容量边界。", en: "Storage owns FIFO order, reload recovery and capacity boundaries." },
  { icon: Boxes, label: "Representation", zh: "Codec 与 Compression 只负责批次的网络表示。", en: "Codec and Compression own only the batch's wire representation." },
  { icon: Network, label: "Delivery", zh: "Transport 负责目标、鉴权、超时与响应分类。", en: "Transport owns destination, authentication, timeouts and response classification." },
];

export default function ArchitectureGuidePage() {
  const locale = useLocale();
  const en = locale === "en";
  return (
    <DocsLayout
      page="guide"
      eyebrow={en ? "Architecture guide · 12 min read" : "架构文章 · 约 12 分钟"}
      title={en ? "Designing a backend-agnostic browser analytics SDK" : "如何设计一个与后端解耦的浏览器埋点 SDK"}
      description={en ? "A practical guide to the contracts, reliability semantics and privacy boundaries that keep product instrumentation stable while backends evolve." : "从稳定契约、可靠性语义和隐私边界出发，让业务埋点在后端持续演进时仍保持稳定。"}
      items={navigation[locale]}
    >
      <article className="space-y-14">
        <section id="guide-architecture">
          <div className="flex flex-wrap gap-2"><Badge>TypeScript</Badge><Badge className="border-white/10 bg-white/5 text-slate-300">Browser SDK</Badge><Badge className="border-white/10 bg-white/5 text-slate-300">Open source</Badge></div>
          <p className="manual-copy text-base">{en ? "An analytics SDK becomes expensive when event calls know too much about the current backend: endpoint shapes, vendor schemas, compression rules and retry policy leak into product code. The real goal is not to hide HTTP. It is to create a boundary where product semantics remain stable while every delivery detail can change independently." : "当事件调用了解太多当前后端细节时，埋点 SDK 很快就会变得昂贵：Endpoint 结构、厂商 Schema、压缩规则和重试策略逐步泄漏到业务代码。真正的目标并不是隐藏 HTTP，而是建立一个边界，让业务语义保持稳定，同时允许所有投递细节独立演进。"}</p>
          <div className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.045] p-5 text-sm leading-7 text-emerald-50">{en ? "Design rule: product code describes what happened; adapters decide how that fact is persisted, represented and delivered." : "设计原则：业务代码只描述发生了什么；Adapter 决定这个事实如何持久化、编码并投递。"}</div>
          <div className="mt-8 grid gap-3">
            {layers.map(({ icon: Icon, label, zh, en: englishCopy }, index) => <div key={label} className="grid gap-3 rounded-xl border border-white/8 bg-black/20 p-4 sm:grid-cols-[52px_150px_1fr] sm:items-center"><span className="grid size-10 place-items-center rounded-lg bg-white/5 text-emerald-300"><Icon className="size-5" /></span><strong className="font-mono text-sm text-slate-200">0{index + 1} · {label}</strong><span className="text-sm leading-6 text-slate-400">{en ? englishCopy : zh}</span></div>)}
          </div>
        </section>

        <ArticleSection id="guide-contracts" icon={Braces} title={en ? "Stable contracts are the decoupling mechanism" : "稳定契约才是真正的解耦机制"}>
          <p>{en ? "A backend-agnostic SDK should not expose a different client for every destination. It exposes one event lifecycle and depends on narrow capabilities. Transport does not know how an event was collected. Storage does not know where it will be sent. Codec does not decide retry policy." : "后端无关的 SDK 不应该为每个目标暴露一套客户端，而应暴露统一事件生命周期，并只依赖狭窄能力。Transport 不需要知道事件如何采集，Storage 不需要知道事件发往哪里，Codec 也不负责决定重试策略。"}</p>
          <CodeBlock code={contractCode} filename="contracts.ts" />
          <p>{en ? "These interfaces are intentionally small. New adapters can be tested with deterministic inputs, and applications can migrate one boundary at a time instead of rewriting every track call." : "这些接口有意保持精简。新 Adapter 可以通过确定性输入独立测试，应用也能一次只迁移一个边界，而不需要重写所有 track 调用。"}</p>
        </ArticleSection>

        <ArticleSection id="guide-delivery" icon={Database} title={en ? "Reliable delivery begins before fetch()" : "可靠投递早在 fetch() 之前就开始了"}>
          <p>{en ? "A network request is only the last step. Events should enter a FIFO queue first, then be selected into bounded batches. A retryable failure keeps the batch; a non-retryable failure removes it so one invalid payload cannot block the queue forever." : "网络请求只是最后一步。事件应先进入 FIFO 队列，再被选择为有明确上限的批次。可重试失败保留批次；不可重试失败移除批次，避免一个无效 Payload 永久阻塞队列。"}</p>
          <ul className="grid gap-3 text-sm leading-7 text-slate-400 sm:grid-cols-2">
            <li className="manual-card"><strong className="text-slate-100">At least once</strong><br />{en ? "Keep a stable eventId and deduplicate in the collector." : "事件保留稳定 eventId，并由 Collector 幂等去重。"}</li>
            <li className="manual-card"><strong className="text-slate-100">Bounded memory</strong><br />{en ? "Limit event, batch and queue sizes independently." : "分别限制单事件、单批次和队列大小。"}</li>
            <li className="manual-card"><strong className="text-slate-100">Retry classification</strong><br />{en ? "Retry network errors, 408, 429 and 5xx with backoff." : "网络错误、408、429 与 5xx 使用退避重试。"}</li>
            <li className="manual-card"><strong className="text-slate-100">Multi-tab coordination</strong><br />{en ? "Use a delivery lock when tabs share one persistent queue." : "多个 Tab 共享持久化队列时，需要使用投递锁。"}</li>
          </ul>
        </ArticleSection>

        <ArticleSection id="guide-privacy" icon={LockKeyhole} title={en ? "Consent belongs before identity creation" : "Consent 必须位于身份创建之前"}>
          <p>{en ? "Checking consent only before HTTP delivery is too late: an identifier may already exist and sensitive properties may already be persisted. Collection policy must run before identity generation, event construction and storage." : "只在 HTTP 投递前检查 Consent 已经太迟：身份标识可能已经生成，敏感属性也可能已经持久化。采集策略必须在身份生成、事件构造和存储之前执行。"}</p>
          <p>{en ? "Autocapture should also have a deliberately narrow contract. Navigation and global errors are observable without scraping button text, input values or arbitrary DOM attributes. Explicit business events remain the source of truth for revenue, signup and workflow milestones." : "自动采集同样需要刻意收窄边界。SPA 导航和全局错误可以在不扫描按钮文本、输入值或任意 DOM 属性的前提下观察。收入、注册和业务流程里程碑仍应以显式业务事件为准。"}</p>
        </ArticleSection>

        <ArticleSection id="guide-codec" icon={Boxes} title={en ? "Protobuf belongs behind the codec contract" : "Protobuf 应该位于 Codec 契约之后"}>
          <p>{en ? "Binary encoding is a delivery optimization, not a product instrumentation concern. Keep the core SDK independent of one Protobuf runtime, generated schema or compression implementation. Applications that need the bandwidth win inject a codec; everyone else keeps JSON." : "二进制编码是投递优化，而不是业务埋点关注点。核心 SDK 不应绑定某个 Protobuf Runtime、生成 Schema 或压缩实现。需要节省带宽的应用注入 Codec，其他应用继续使用 JSON。"}</p>
          <CodeBlock code={setupCode} filename="analytics.ts" />
          <p>{en ? "This separation also makes benchmarking honest: compare the encoded and compressed batch at the exact same event boundary instead of comparing two different SDK lifecycles." : "这种分离也让 Benchmark 更可信：在完全相同的事件边界上比较编码与压缩后的批次，而不是比较两套不同的 SDK 生命周期。"}</p>
        </ArticleSection>

        <ArticleSection id="guide-checklist" icon={ShieldCheck} title={en ? "Implementation checklist" : "落地检查清单"}>
          <ol className="grid gap-3 text-sm leading-7 text-slate-300">
            {(en ? [
              "Define one stable event envelope with eventId, timestamp, identity, context and schemaVersion.",
              "Run consent and transformation plugins before persistence.",
              "Persist before delivery and preserve FIFO order across routing boundaries.",
              "Classify retryable responses and cap event, batch and queue sizes.",
              "Keep Codec, Compression, Transport and Storage replaceable and independently testable.",
              "Expose diagnostics that never create more analytics events.",
              "Test reload recovery, pagehide, multi-tab delivery and storage failure in real browsers.",
            ] : [
              "定义稳定事件信封，包含 eventId、timestamp、identity、context 与 schemaVersion。",
              "在持久化之前执行 Consent 与转换插件。",
              "先入队再投递，并在路由边界之间保持 FIFO 顺序。",
              "区分可重试响应，并限制事件、批次与队列大小。",
              "让 Codec、Compression、Transport 与 Storage 可替换且可独立测试。",
              "暴露不会继续生成埋点事件的诊断通道。",
              "在真实浏览器中测试刷新恢复、pagehide、多 Tab 与存储失败。",
            ]).map((item, index) => <li key={item} className="flex gap-4 rounded-xl border border-white/8 bg-black/20 p-4"><span className="font-mono text-emerald-300">0{index + 1}</span><span>{item}</span></li>)}
          </ol>
          <div className="mt-8 flex flex-wrap gap-3"><Button asChild><a href={sitePath("playground", locale)}>{en ? "Run the lifecycle" : "在线运行这套生命周期"}<ArrowRight className="size-4" /></a></Button><Button asChild variant="outline"><a href={sitePath("quickstart", locale)}>{en ? "Implement the quickstart" : "开始接入 Quickstart"}</a></Button></div>
        </ArticleSection>
      </article>
    </DocsLayout>
  );
}

function ArticleSection({ id, icon: Icon, title, children }: { id: string; icon: typeof Braces; title: string; children: ReactNode }) {
  return <section id={id} className="scroll-mt-24"><div className="manual-heading"><Icon className="size-5" /><h3>{title}</h3></div><div className="mt-5 space-y-6 text-[15px] leading-8 text-slate-400">{children}</div></section>;
}
