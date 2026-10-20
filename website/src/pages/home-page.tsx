import {
  ArrowRight,
  BookOpen,
  Boxes,
  Braces,
  Database,
  FlaskConical,
  LockKeyhole,
  Network,
  PackageCheck,
  Play,
  Plug,
  Radio,
  RotateCcw,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CodeBlock } from "@/components/code-block";
import { InstallCommand } from "@/components/install-command";
import { useLocale } from "@/i18n";
import { sitePath, type SitePage } from "@/routing";
import quickstartCode from "../../../examples/quickstart.ts?raw";

const features = [
  { icon: Braces, zh: "类型安全事件", en: "Type-safe events", zhCopy: "以 EventMap 在编译期约束事件名和属性，重构业务代码时更安心。", enCopy: "Use an EventMap to validate event names and properties at compile time." },
  { icon: Database, zh: "可靠本地队列", en: "Durable local queue", zhCopy: "IndexedDB 持久化未发送事件，Web Locks 协调多 Tab。", enCopy: "IndexedDB persists pending events while Web Locks coordinate tabs." },
  { icon: ShieldCheck, zh: "隐私优先", en: "Privacy first", zhCopy: "Consent 在身份生成与事件创建前执行，拒绝后可立即清理本地数据。", enCopy: "Consent runs before identity or event creation and can clear local data." },
  { icon: Plug, zh: "可插拔边界", en: "Replaceable boundaries", zhCopy: "Transport、Storage、Codec 与插件都可以独立替换。", enCopy: "Replace transport, storage, codecs and plugins independently." },
];

const deliverySteps = [
  { icon: Radio, label: "Collect", zh: "业务事件进入统一生命周期", en: "Events enter one lifecycle" },
  { icon: Boxes, label: "Process", zh: "插件清洗、采样与补充上下文", en: "Plugins redact, sample and enrich" },
  { icon: Database, label: "Persist", zh: "先入队，再按批次读取", en: "Queue first, then read a batch" },
  { icon: Network, label: "Deliver", zh: "编码、压缩并交给 Transport", en: "Encode, compress and transport" },
];

const docs: Array<{ page: Exclude<SitePage, "home">; icon: typeof BookOpen; zh: string; en: string; zhCopy: string; enCopy: string }> = [
  { page: "playground", icon: Play, zh: "在线体验", en: "Playground", zhCopy: "无需后端即可创建事件、观察队列、模拟失败并检查真实批次负载。", enCopy: "Create events, inspect the queue, simulate failure and view a real batch without a backend." },
  { page: "quickstart", icon: BookOpen, zh: "快速开始", en: "Quickstart", zhCopy: "从安装、初始化、类型安全事件到 Collector，在一条主路径里完成首次接入。", enCopy: "Go from installation and typed events to a working collector in one guided path." },
  { page: "examples", icon: FlaskConical, zh: "场景示例", en: "Examples", zhCopy: "查找 Transport、Storage、Protobuf、插件、框架与自定义 Adapter 的可复制代码。", enCopy: "Copy recipes for transports, storage, Protobuf, plugins, frameworks and custom adapters." },
  { page: "reference", icon: Braces, zh: "API 参考", en: "API Reference", zhCopy: "按对象查询配置项、实例方法、内置 Adapter、插件和诊断事件。", enCopy: "Look up options, instance methods, built-in adapters, plugins and diagnostics." },
];

export function HomePage() {
  const locale = useLocale();
  const en = locale === "en";
  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-white/8 px-5 py-24 sm:py-32 lg:px-8">
        <div className="hero-glow" aria-hidden="true" />
        <div className="grid-pattern" aria-hidden="true" />
        <div className="relative mx-auto max-w-5xl text-center">
          <Badge><span className="mr-2 size-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_#6ee7b7]" />Open source · Browser SDK</Badge>
          <h1 className="mt-8 text-balance text-5xl font-semibold tracking-[-0.045em] sm:text-7xl lg:text-8xl">
            {en ? "Every event, clearly accounted for." : "每一个事件，都有迹可循。"}
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-pretty text-lg leading-8 text-slate-400 sm:text-xl">
            {en ? "Tracelet decouples product instrumentation from your backend through a stable, replaceable pipeline for collection, persistence, encoding and delivery." : "Tracelet 将业务埋点与后端实现解耦，以稳定、可替换的管线完成采集、持久化、编码和投递。"}
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg"><a href={sitePath("playground", locale)}><Play className="size-4" />{en ? "Try it live" : "在线体验"}</a></Button>
            <Button asChild size="lg" variant="outline"><a href={sitePath("quickstart", locale)}>{en ? "Start in five minutes" : "五分钟接入"}<ArrowRight className="size-4" /></a></Button>
          </div>
          <div className="mx-auto mt-14 flex max-w-xl items-center justify-between gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-black/25 p-3 text-xs text-slate-400 shadow-2xl shadow-emerald-950/20 sm:text-sm">
            {[["track()", Zap], ["plugins", Plug], ["queue", Database], ["codec", Braces], ["transport", Network]].map(([label, Icon], index) => {
              const PipelineIcon = Icon as typeof Zap;
              return <div className="contents" key={label as string}><span className="flex shrink-0 items-center gap-2 rounded-lg bg-white/5 px-3 py-2"><PipelineIcon className="size-3.5 text-emerald-300" />{label as string}</span>{index < 4 ? <ArrowRight className="size-3 shrink-0 text-slate-700" /> : null}</div>;
            })}
          </div>
        </div>
      </section>

      <section id="architecture" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="max-w-2xl">
          <span className="section-kicker">01 / Architecture</span>
          <h2>{en ? "A focused core with replaceable boundaries" : "专注的核心，可替换的边界"}</h2>
          <p className="section-copy">{en ? "Application code depends on one public API while platform and backend details stay behind adapters." : "业务代码只依赖稳定公开 API，平台能力和后端差异都留在 Adapter 边界之后。"}</p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, zh, en: englishTitle, zhCopy, enCopy }) => (
            <Card key={zh} className="group transition-colors hover:border-emerald-300/25 hover:bg-emerald-300/[0.035]">
              <CardHeader><span className="grid size-11 place-items-center rounded-xl border border-white/10 bg-white/5 text-emerald-300"><Icon className="size-5" /></span><h3>{en ? englishTitle : zh}</h3></CardHeader>
              <CardContent><p className="text-sm leading-7 text-slate-400">{en ? enCopy : zhCopy}</p></CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-white/8 bg-white/[0.018]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <span className="section-kicker">02 / Quickstart</span>
            <h2>{en ? "Install from npm and send the first event" : "通过 npm 安装并发送第一个事件"}</h2>
            <p className="section-copy">{en ? "The quickstart explains every line, then guides you through consent, lifecycle and production delivery." : "Quickstart 会解释每一行代码，再带你完成 Consent、生命周期和生产投递。"}</p>
            <div className="mt-8 flex flex-wrap gap-2">
              <Badge className="border-white/10 bg-white/5 text-slate-300"><PackageCheck className="mr-1.5 size-3.5" />ES Modules</Badge>
              <Badge className="border-white/10 bg-white/5 text-slate-300"><LockKeyhole className="mr-1.5 size-3.5" />Consent first</Badge>
              <Badge className="border-white/10 bg-white/5 text-slate-300"><RotateCcw className="mr-1.5 size-3.5" />Retry built-in</Badge>
            </div>
            <Button asChild variant="outline" className="mt-8"><a href={sitePath("quickstart", locale)}>{en ? "Read the quickstart" : "阅读快速开始"}<ArrowRight className="size-4" /></a></Button>
          </div>
          <div className="min-w-0 space-y-5"><InstallCommand /><CodeBlock code={quickstartCode} filename="analytics.ts" /></div>
        </div>
      </section>

      <section id="delivery" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="max-w-2xl">
          <span className="section-kicker">03 / Delivery</span>
          <h2>{en ? "Reliable delivery you can reason about" : "浏览器里可解释的可靠投递"}</h2>
          <p className="section-copy">{en ? "Tracelet provides at-least-once client delivery; collectors deduplicate with eventId." : "Tracelet 采用客户端至少一次投递，并建议服务端基于 eventId 幂等去重。"}</p>
        </div>
        <div className="relative mt-12 grid gap-4 lg:grid-cols-4">
          <div className="absolute left-[12.5%] right-[12.5%] top-8 hidden h-px bg-gradient-to-r from-emerald-400/10 via-emerald-300/60 to-emerald-400/10 lg:block" />
          {deliverySteps.map(({ icon: Icon, label, zh, en: englishCopy }, index) => (
            <div key={label} className="relative rounded-2xl border border-white/8 bg-[#090e10] p-6">
              <span className="grid size-16 place-items-center rounded-full border border-emerald-300/20 bg-[#07100d] text-emerald-300"><Icon className="size-6" /></span>
              <small className="mt-7 block font-mono text-emerald-400/70">0{index + 1}</small><h3 className="mt-2">{label}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{en ? englishCopy : zh}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-white/8 bg-white/[0.018]">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <div className="max-w-2xl"><span className="section-kicker">04 / Documentation</span><h2>{en ? "Choose the shortest path to an answer" : "用最短路径找到答案"}</h2><p className="section-copy">{en ? "Learn in order, copy a recipe, or look up one exact contract." : "按顺序学习、复制场景方案，或直接查询某个契约。"}</p></div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {docs.map(({ page, icon: Icon, zh, en: englishTitle, zhCopy, enCopy }) => (
              <a key={page} href={sitePath(page, locale)} className="group rounded-2xl border border-white/10 bg-black/15 p-6 transition hover:-translate-y-0.5 hover:border-emerald-300/30 hover:bg-emerald-300/[0.035]">
                <Icon className="size-6 text-emerald-300" /><h3 className="mt-6 text-xl">{en ? englishTitle : zh}</h3><p className="mt-3 text-sm leading-7 text-slate-400">{en ? enCopy : zhCopy}</p><span className="mt-6 flex items-center gap-2 text-sm text-emerald-300">{en ? "Open" : "打开"}<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
              </a>
            ))}
          </div>
          <a href={sitePath("guide", locale)} className="group mt-5 flex flex-col justify-between gap-5 rounded-2xl border border-white/10 bg-gradient-to-r from-emerald-300/[0.06] to-transparent p-6 transition hover:border-emerald-300/30 sm:flex-row sm:items-center">
            <span><span className="font-mono text-[11px] uppercase tracking-[0.13em] text-emerald-300">{en ? "Architecture guide" : "架构文章"}</span><strong className="mt-2 block text-lg text-slate-100">{en ? "Designing a backend-agnostic browser analytics SDK" : "如何设计一个与后端解耦的浏览器埋点 SDK"}</strong><span className="mt-2 block text-sm text-slate-400">{en ? "Contracts, durable queues, consent and the correct boundary for Protobuf." : "稳定契约、可靠队列、Consent，以及 Protobuf 应该放在哪里。"}</span></span>
            <span className="flex shrink-0 items-center gap-2 text-sm text-emerald-300">{en ? "Read guide" : "阅读文章"}<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
          </a>
        </div>
      </section>
    </>
  );
}
