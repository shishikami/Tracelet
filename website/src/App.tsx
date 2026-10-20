import { lazy, Suspense, useEffect, useState } from "react";
import { Code2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { HomePage } from "@/pages/home-page";
import { useLocale } from "@/i18n";
import { pageFromPath, sitePath, type SitePage } from "@/routing";

const QuickstartPage = lazy(() => import("@/pages/quickstart-page"));
const ExamplesPage = lazy(() => import("@/pages/examples-page"));
const ReferencePage = lazy(() => import("@/pages/reference-page"));
const PlaygroundPage = lazy(() => import("@/pages/playground-page"));
const ArchitectureGuidePage = lazy(() => import("@/pages/architecture-guide-page"));

function MobileMenu({ page, onClose }: { page: SitePage; onClose: () => void }) {
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

  const links: Array<[SitePage, string]> = [
    ["home", en ? "Home" : "首页"],
    ["playground", "Playground"],
    ["quickstart", "Quickstart"],
    ["examples", en ? "Examples" : "示例"],
    ["reference", "API Reference"],
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#070b0d]/96 p-5 backdrop-blur-xl md:hidden" role="dialog" aria-modal="true" aria-label={en ? "Mobile navigation" : "移动端导航"}>
      <div className="flex items-center justify-between">
        <strong>Tracelet</strong>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label={en ? "Close navigation" : "关闭导航"} autoFocus><X className="size-5" /></Button>
      </div>
      <nav className="mt-12 grid gap-3 text-2xl" aria-label={en ? "Mobile navigation" : "移动端导航"}>
        {links.map(([target, label]) => (
          <a key={target} href={sitePath(target, locale)} onClick={onClose} aria-current={target === page ? "page" : undefined}>{label}</a>
        ))}
        <a href={sitePath(page, en ? "zh-CN" : "en")}>{en ? "中文" : "English"}</a>
        <a href="https://github.com/shishikami/Tracelet">GitHub</a>
      </nav>
    </div>
  );
}

function CurrentPage({ page }: { page: SitePage }) {
  if (page === "playground") return <PlaygroundPage />;
  if (page === "guide") return <ArchitectureGuidePage />;
  if (page === "quickstart") return <QuickstartPage />;
  if (page === "examples") return <ExamplesPage />;
  if (page === "reference") return <ReferencePage />;
  return <HomePage />;
}

export function App() {
  const locale = useLocale();
  const en = locale === "en";
  const page = pageFromPath();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div id="top" className="min-h-screen bg-[#070b0d] text-slate-100">
      <SiteHeader page={page} onMenuClick={() => setMenuOpen(true)} />
      {menuOpen ? <MobileMenu page={page} onClose={() => setMenuOpen(false)} /> : null}
      <main>
        <Suspense fallback={<div className="mx-auto min-h-[60vh] max-w-7xl px-5 py-24 text-sm text-slate-500">{en ? "Loading documentation…" : "正在加载文档…"}</div>}>
          <CurrentPage page={page} />
        </Suspense>
      </main>
      <footer className="border-t border-white/8 px-5 py-10 text-sm text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 sm:flex-row lg:px-3">
          <div>
            <p>Tracelet · Backend-agnostic browser analytics</p>
            <p className="mt-1 text-xs text-slate-600">
              {en ? "Cookie-free page traffic is measured with Vercel Web Analytics." : "本站使用不依赖 Cookie 的 Vercel Web Analytics 统计页面访问。"}
            </p>
          </div>
          <div className="flex flex-wrap gap-5">
            <a className="hover:text-white" href="https://www.npmjs.com/package/tracelet-browser" target="_blank" rel="noreferrer">npm</a>
            <a className="hover:text-white" href="https://github.com/shishikami/Tracelet" target="_blank" rel="noreferrer"><Code2 className="mr-1 inline size-3.5" />GitHub</a>
            <a className="hover:text-white" href={sitePath("playground", locale)}>Playground</a>
            <a className="hover:text-white" href={sitePath("quickstart", locale)}>Quickstart</a>
            <a className="hover:text-white" href={sitePath("reference", locale)}>API</a>
            <a className="hover:text-white" href={sitePath("guide", locale)}>{en ? "Architecture guide" : "架构文章"}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
