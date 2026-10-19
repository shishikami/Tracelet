import { useState } from "react";
import { Code2, Languages, Menu, Search } from "lucide-react";
import { DocsSearch } from "@/components/docs-search";
import { Button } from "@/components/ui/button";
import { localizedPath, useLocale } from "@/i18n";

interface SiteHeaderProps {
  onMenuClick: () => void;
}

export function SiteHeader({ onMenuClick }: SiteHeaderProps) {
  const locale = useLocale();
  const en = locale === "en";
  const [searchOpen, setSearchOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#070b0d]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
        <a href="#top" className="flex items-center gap-3" aria-label={en ? "Tracelet home" : "Tracelet 首页"}>
          <span className="grid size-9 place-items-center rounded-xl bg-emerald-400 font-mono text-sm font-black text-slate-950 shadow-lg shadow-emerald-400/15">T</span>
          <span className="font-semibold tracking-tight">Tracelet</span>
        </a>
        <nav className="hidden items-center gap-2 md:flex" aria-label={en ? "Main navigation" : "主导航"}>
          <Button asChild variant="ghost"><a href="#architecture">{en ? "Architecture" : "架构"}</a></Button>
          <Button asChild variant="ghost"><a href="#docs">{en ? "Docs" : "文档"}</a></Button>
          <Button asChild variant="ghost"><a href="#delivery">{en ? "Delivery" : "投递"}</a></Button>
          <Button asChild variant="ghost"><a href="#manual">{en ? "Guide" : "手册"}</a></Button>
          <Button asChild variant="ghost"><a href="#api-reference">API</a></Button>
          <Button type="button" variant="ghost" onClick={() => setSearchOpen(true)} aria-label={en ? "Search documentation" : "搜索文档"}><Search className="size-4" />{en ? "Search" : "搜索"}<kbd className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">⌘K</kbd></Button>
          <Button asChild variant="ghost"><a href={localizedPath(en ? "zh-CN" : "en")} hrefLang={en ? "zh-CN" : "en"}><Languages className="size-4" />{en ? "中文" : "EN"}</a></Button>
          <Button asChild variant="outline"><a href="https://github.com/shishikami/Tracelet" target="_blank" rel="noreferrer"><Code2 className="size-4" />GitHub</a></Button>
        </nav>
        <div className="flex items-center md:hidden">
          <Button type="button" variant="ghost" size="icon" onClick={() => setSearchOpen(true)} aria-label={en ? "Search documentation" : "搜索文档"}><Search className="size-5" /></Button>
          <Button type="button" variant="ghost" size="icon" onClick={onMenuClick} aria-label={en ? "Open navigation" : "打开导航"}><Menu className="size-5" /></Button>
        </div>
      </div>
      <DocsSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
