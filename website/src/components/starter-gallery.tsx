import { ArrowUpRight, Boxes, Cloud, Component } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/i18n";

const stackBlitzBase = "https://stackblitz.com/fork/github/shishikami/Tracelet/tree/main/examples/starters";

const starters = [
  {
    icon: Component,
    title: "React + Vite",
    zh: "应用级单例、根组件初始化、类型安全事件与实时诊断。",
    en: "An application singleton, root initialization, typed events and live diagnostics.",
    href: `${stackBlitzBase}/react-vite?startScript=dev&title=Tracelet%20React%20Starter`,
    actionZh: "在 StackBlitz 运行",
    actionEn: "Run in StackBlitz",
  },
  {
    icon: Boxes,
    title: "Vue + Vite",
    zh: "在挂载前初始化，业务处理器显式追踪，开箱即用的 Console Transport。",
    en: "Initialize before mount, track from business handlers and start with Console Transport.",
    href: `${stackBlitzBase}/vue-vite?startScript=dev&title=Tracelet%20Vue%20Starter`,
    actionZh: "在 StackBlitz 运行",
    actionEn: "Run in StackBlitz",
  },
  {
    icon: Cloud,
    title: "Vercel Collector",
    zh: "可测试的无状态 Node.js Function，包含 Origin 白名单、gzip、双层大小边界、鉴权扩展与持久化 Sink 契约。",
    en: "A tested stateless Node.js Function with origin allowlisting, gzip, dual body limits, optional auth and a durable sink contract.",
    href: "https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fshishikami%2FTracelet&root-directory=examples%2Fstarters%2Fcollector-vercel&project-name=tracelet-collector",
    actionZh: "部署到 Vercel",
    actionEn: "Deploy to Vercel",
  },
] as const;

export function StarterGallery() {
  const en = useLocale() === "en";
  return (
    <section id="starters" className="mb-14 scroll-mt-24">
      <div className="manual-heading"><Boxes className="size-5" /><h3>{en ? "Runnable starters" : "一键运行模板"}</h3></div>
      <p className="manual-copy">{en ? "Start from a complete, editable project instead of translating isolated snippets. The frontend starters work without a backend; the collector starter shows the production boundary." : "从完整可编辑的项目开始，不必自行拼接零散代码。前端模板无需后端即可运行，Collector 模板则展示生产接收边界。"}</p>
      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        {starters.map(({ icon: Icon, title, zh, en: englishCopy, href, actionZh, actionEn }) => (
          <a key={title} href={href} target="_blank" rel="noreferrer" className="group rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:-translate-y-0.5 hover:border-emerald-300/30 hover:bg-emerald-300/[0.035]">
            <div className="flex items-start justify-between gap-4"><span className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-emerald-300"><Icon className="size-5" /></span><Badge className="border-white/8 bg-white/5 text-[10px] text-slate-400">Starter</Badge></div>
            <h4 className="mt-5 font-semibold text-slate-100">{title}</h4>
            <p className="mt-2 text-sm leading-7 text-slate-400">{en ? englishCopy : zh}</p>
            <span className="mt-5 flex items-center gap-2 text-sm text-emerald-300">{en ? actionEn : actionZh}<ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></span>
          </a>
        ))}
      </div>
    </section>
  );
}
