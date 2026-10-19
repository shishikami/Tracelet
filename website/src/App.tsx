import { useEffect, useState } from "react";
import {
  ArrowRight,
  Boxes,
  Braces,
  Database,
  Code2,
  LockKeyhole,
  Network,
  PackageCheck,
  Plug,
  Radio,
  RotateCcw,
  ShieldCheck,
  X,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CodeBlock } from "@/components/code-block";
import { InstallCommand } from "@/components/install-command";
import { Manual } from "@/components/manual";
import { ApiReference } from "@/components/api-reference";
import { SiteHeader } from "@/components/site-header";
import { localizedPath, useLocale } from "@/i18n";
import quickstartCode from "../../examples/quickstart.ts?raw";

const features = [
  { icon: Braces, title: "类型安全事件", description: "以 EventMap 在编译期约束事件名和属性，重构业务代码时更安心。" },
  { icon: Database, title: "可靠本地队列", description: "IndexedDB 持久化未发送事件，Web Locks 协调多 Tab，刷新页面和网络抖动都不轻易丢失。" },
  { icon: ShieldCheck, title: "隐私优先", description: "Consent 在身份生成与事件创建前执行，拒绝后可立即清理本地数据。" },
  { icon: Plug, title: "低侵入自动采集", description: "可选捕获 SPA 页面浏览和全局错误，不扫描 DOM，也不要求业务组件增加属性。" },
];

const deliverySteps = [
  { icon: Radio, label: "Collect", detail: "业务事件进入统一生命周期" },
  { icon: Boxes, label: "Process", detail: "插件清洗、采样与补充上下文" },
  { icon: Database, label: "Persist", detail: "先入队，再按批次读取" },
  { icon: Network, label: "Deliver", detail: "编码、压缩并交给 Transport" },
];

const englishFeatures = [
  { icon: Braces, title: "Type-safe events", description: "Use an EventMap to validate event names and properties at compile time, making application refactors safer." },
  { icon: Database, title: "Durable local queue", description: "IndexedDB persists pending events while Web Locks coordinate tabs, surviving reloads and unstable networks." },
  { icon: ShieldCheck, title: "Privacy first", description: "Consent runs before identity or event creation, and denial can immediately clear local analytics data." },
  { icon: Plug, title: "Low-impact autocapture", description: "Optionally observe SPA navigation and global errors without scanning the DOM or changing application components." },
];

const englishDeliverySteps = [
  { icon: Radio, label: "Collect", detail: "Business events enter one lifecycle" },
  { icon: Boxes, label: "Process", detail: "Plugins redact, sample and enrich context" },
  { icon: Database, label: "Persist", detail: "Queue first, then read an ordered batch" },
  { icon: Network, label: "Deliver", detail: "Encode, compress and call the transport" },
];

function MobileMenu({ onClose }: { onClose: () => void }) {
  const locale = useLocale();
  const en = locale === "en";
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-[#070b0d]/96 p-5 backdrop-blur-xl md:hidden" role="dialog" aria-modal="true" aria-label={en ? "Mobile navigation" : "移动端导航"}>
      <div className="flex items-center justify-between">
        <strong>Tracelet</strong>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label={en ? "Close navigation" : "关闭导航"} autoFocus><X className="size-5" /></Button>
      </div>
      <nav className="mt-12 grid gap-3 text-2xl" aria-label={en ? "Mobile navigation" : "移动端导航"}>
        <a href="#architecture" onClick={onClose}>{en ? "Architecture" : "架构"}</a>
        <a href="#docs" onClick={onClose}>{en ? "Docs" : "文档"}</a>
        <a href="#delivery" onClick={onClose}>{en ? "Reliable delivery" : "可靠投递"}</a>
        <a href="#manual" onClick={onClose}>{en ? "User guide" : "用户手册"}</a>
        <a href="#api-reference" onClick={onClose}>API Reference</a>
        <a href={localizedPath(en ? "zh-CN" : "en")}>{en ? "中文" : "English"}</a>
        <a href="https://github.com/shishikami/Tracelet">GitHub</a>
      </nav>
    </div>
  );
}

export function App() {
  const locale = useLocale();
  const en = locale === "en";
  const [menuOpen, setMenuOpen] = useState(false);
  const localizedFeatures = en ? englishFeatures : features;
  const localizedDeliverySteps = en ? englishDeliverySteps : deliverySteps;

  return (
    <div id="top" className="min-h-screen overflow-hidden bg-[#070b0d] text-slate-100">
      <SiteHeader onMenuClick={() => setMenuOpen(true)} />
      {menuOpen ? <MobileMenu onClose={() => setMenuOpen(false)} /> : null}

      <main>
        <section className="relative isolate border-b border-white/8 px-5 py-24 sm:py-32 lg:px-8">
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
              <Button asChild size="lg"><a href="#docs">{en ? "Start in five minutes" : "五分钟接入"} <ArrowRight className="size-4" /></a></Button>
              <Button asChild size="lg" variant="outline"><a href="https://github.com/shishikami/Tracelet" target="_blank" rel="noreferrer"><Code2 className="size-4" />{en ? "View source" : "查看源码"}</a></Button>
            </div>
            <div className="mx-auto mt-14 flex max-w-xl items-center justify-between gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-black/25 p-3 text-xs text-slate-400 shadow-2xl shadow-emerald-950/20 sm:text-sm">
              {[
                ["track()", Zap], ["plugins", Plug], ["queue", Database], ["codec", Braces], ["transport", Network],
              ].map(([label, Icon], index) => {
                const PipelineIcon = Icon as typeof Zap;
                return <div className="contents" key={label as string}><span className="flex shrink-0 items-center gap-2 rounded-lg bg-white/5 px-3 py-2"><PipelineIcon className="size-3.5 text-emerald-300" />{label as string}</span>{index < 4 ? <ArrowRight className="size-3 shrink-0 text-slate-700" /> : null}</div>;
              })}
            </div>
          </div>
        </section>

        <section id="architecture" className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <div className="max-w-2xl">
            <span className="section-kicker">01 / Architecture</span>
            <h2>{en ? "Keep the SDK core focused on stable contracts" : "SDK Core 只负责稳定的事情"}</h2>
            <p className="section-copy">{en ? "Applications depend on the public API, the core depends on abstract contracts, and platform-specific behavior stays behind adapters." : "业务依赖公开 API，核心依赖抽象契约，具体平台能力停留在 Adapter 边界。"}</p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {localizedFeatures.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="group transition-colors hover:border-emerald-300/25 hover:bg-emerald-300/[0.035]">
                <CardHeader><span className="grid size-11 place-items-center rounded-xl border border-white/10 bg-white/5 text-emerald-300"><Icon className="size-5" /></span><h3>{title}</h3></CardHeader>
                <CardContent><p className="text-sm leading-7 text-slate-400">{description}</p></CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="docs" className="border-y border-white/8 bg-white/[0.018]">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-24 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
            <div>
              <span className="section-kicker">02 / Quickstart</span>
              <h2>{en ? "Install from npm and start collecting in five minutes" : "通过 npm 接入，五分钟开始采集"}</h2>
              <p className="section-copy">{en ? "Use GitHub for collaboration and source review; install the released SDK from npm to pin versions and receive complete TypeScript types." : "GitHub 用于协作与阅读源码；应用项目通过 npm 安装正式发布的 SDK、锁定版本并获得完整 TypeScript 类型。"}</p>
              <div className="mt-8 flex flex-wrap gap-2">
                <Badge className="border-white/10 bg-white/5 text-slate-300"><PackageCheck className="mr-1.5 size-3.5" />ES Modules</Badge>
                <Badge className="border-white/10 bg-white/5 text-slate-300"><LockKeyhole className="mr-1.5 size-3.5" />Consent first</Badge>
                <Badge className="border-white/10 bg-white/5 text-slate-300"><RotateCcw className="mr-1.5 size-3.5" />Retry built-in</Badge>
              </div>
            </div>
            <div className="space-y-5">
              <InstallCommand />
              <CodeBlock code={quickstartCode} filename="analytics.ts" />
            </div>
          </div>
        </section>

        <section id="delivery" className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <div className="max-w-2xl">
            <span className="section-kicker">03 / Delivery</span>
            <h2>{en ? "Reliable delivery you can reason about" : "浏览器里可解释的可靠投递"}</h2>
            <p className="section-copy">{en ? "Tracelet provides at-least-once client delivery; collectors should deduplicate idempotently using eventId." : "Tracelet 采用客户端至少一次投递，并建议服务端基于 eventId 幂等去重。"}</p>
          </div>
          <div className="relative mt-14 grid gap-4 lg:grid-cols-4">
            <div className="absolute left-[12.5%] right-[12.5%] top-8 hidden h-px bg-gradient-to-r from-emerald-400/10 via-emerald-300/60 to-emerald-400/10 lg:block" />
            {localizedDeliverySteps.map(({ icon: Icon, label, detail }, index) => (
              <div key={label} className="relative rounded-2xl border border-white/8 bg-[#090e10] p-6">
                <span className="grid size-16 place-items-center rounded-full border border-emerald-300/20 bg-[#07100d] text-emerald-300"><Icon className="size-6" /></span>
                <small className="mt-7 block font-mono text-emerald-400/70">0{index + 1}</small>
                <h3 className="mt-2">{label}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
              </div>
            ))}
          </div>
        </section>
        <Manual />
        <ApiReference />
      </main>

      <footer className="border-t border-white/8 px-5 py-10 text-sm text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 sm:flex-row lg:px-3">
          <div>
            <p>Tracelet · Backend-agnostic browser analytics</p>
            <p className="mt-1 text-xs text-slate-600">
              {en ? "Cookie-free page traffic is measured with Vercel Web Analytics." : "本站使用不依赖 Cookie 的 Vercel Web Analytics 统计页面访问。"}
            </p>
          </div>
          <div className="flex gap-5"><a className="hover:text-white" href="https://www.npmjs.com/package/tracelet-browser" target="_blank" rel="noreferrer">npm</a><a className="hover:text-white" href="https://github.com/shishikami/Tracelet" target="_blank" rel="noreferrer">GitHub</a><a className="hover:text-white" href="#manual">Guide</a><a className="hover:text-white" href="#api-reference">API</a></div>
        </div>
      </footer>
    </div>
  );
}
