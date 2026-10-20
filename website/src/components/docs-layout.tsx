import type { ReactNode } from "react";
import { ArrowRight, BookOpen, Braces, FlaskConical, Play } from "lucide-react";
import { useLocale } from "@/i18n";
import { sitePath, type SitePage } from "@/routing";

export interface DocsNavigationItem {
  id: string;
  label: string;
}

const docPages: Array<{ page: Exclude<SitePage, "home">; icon: typeof BookOpen; zh: string; en: string }> = [
  { page: "playground", icon: Play, zh: "在线体验", en: "Playground" },
  { page: "quickstart", icon: BookOpen, zh: "快速开始", en: "Quickstart" },
  { page: "examples", icon: FlaskConical, zh: "示例", en: "Examples" },
  { page: "reference", icon: Braces, zh: "API 参考", en: "API Reference" },
];

function Sidebar({ page, items, mobile = false }: { page: Exclude<SitePage, "home">; items: readonly DocsNavigationItem[]; mobile?: boolean }) {
  const locale = useLocale();
  const en = locale === "en";
  return (
    <nav aria-label={en ? "Documentation navigation" : "文档导航"}>
      <p className="px-3 pb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">Documentation</p>
      <div className="space-y-1">
        {docPages.map(({ page: target, icon: Icon, zh, en: englishLabel }) => (
          <a
            key={target}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${target === page ? "bg-emerald-300/10 text-emerald-200" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
            href={sitePath(target, locale)}
            aria-current={target === page ? "page" : undefined}
          >
            <Icon className="size-4" />{en ? englishLabel : zh}
          </a>
        ))}
      </div>
      <div className="my-4 border-t border-white/8" />
      <p className="px-3 pb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">{en ? "On this page" : "本页目录"}</p>
      {items.map(({ id, label }) => (
        <a
          key={id}
          className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
          href={`#${id}`}
          onClick={mobile ? (event) => event.currentTarget.closest("details")?.removeAttribute("open") : undefined}
        >
          <span>{label}</span><ArrowRight className="size-3 text-slate-700" />
        </a>
      ))}
    </nav>
  );
}

export function DocsLayout({
  page,
  eyebrow,
  title,
  description,
  items,
  children,
}: {
  page: Exclude<SitePage, "home">;
  eyebrow: string;
  title: string;
  description: ReactNode;
  items: readonly DocsNavigationItem[];
  children: ReactNode;
}) {
  const en = useLocale() === "en";
  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-14 lg:px-8 lg:pt-20">
      <div className="max-w-3xl">
        <span className="section-kicker">{eyebrow}</span>
        <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">{title}</h1>
        <p className="section-copy">{description}</p>
      </div>

      <details data-testid="docs-mobile-contents" className="group mt-10 rounded-2xl border border-white/8 bg-black/20 p-4 lg:hidden">
        <summary className="cursor-pointer list-none px-3 font-mono text-xs uppercase tracking-[0.14em] text-slate-400">
          <span className="flex items-center justify-between">{en ? "Browse documentation" : "浏览文档"}<span aria-hidden="true" className="text-emerald-300 transition-transform group-open:rotate-45">+</span></span>
        </summary>
        <div className="mt-3 border-t border-white/8 pt-3"><Sidebar page={page} items={items} mobile /></div>
      </details>

      <div className="mt-14 grid gap-12 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden h-fit rounded-2xl border border-white/8 bg-black/20 p-4 lg:sticky lg:top-24 lg:block">
          <Sidebar page={page} items={items} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
