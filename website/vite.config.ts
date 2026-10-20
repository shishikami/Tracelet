import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const productionOrigin = "https://tracelet-opal.vercel.app";
const generatedPages = [
  {
    output: "guides/backend-agnostic-analytics-sdk/index.html",
    source: "index.html",
    title: "如何设计后端无关的浏览器埋点 SDK · Tracelet",
    description: "从稳定契约、可靠队列、Consent、Codec、Compression 与 Transport 边界出发，设计一个可维护的前端埋点 SDK。",
    canonical: `${productionOrigin}/guides/backend-agnostic-analytics-sdk`,
    alternate: `${productionOrigin}/en/guides/backend-agnostic-analytics-sdk`,
    article: true,
  },
  {
    output: "guides/typescript-browser-analytics-sdk/index.html",
    source: "index.html",
    title: "TypeScript 前端埋点 SDK：从选型到上线 · Tracelet",
    description: "评估 TypeScript 前端埋点 SDK 的类型安全、隐私、离线队列、后端自主权与可观测性，并完成可上线的 Tracelet 接入。",
    canonical: `${productionOrigin}/guides/typescript-browser-analytics-sdk`,
    alternate: `${productionOrigin}/en/guides/typescript-browser-analytics-sdk`,
    article: true,
  },
  {
    output: "playground/index.html",
    source: "index.html",
    title: "Tracelet Playground · 在线体验浏览器埋点 SDK",
    description: "无需后端即可运行真实 Tracelet SDK：创建事件、查看队列、模拟投递失败并检查 EventBatch。",
    canonical: `${productionOrigin}/playground`,
    alternate: `${productionOrigin}/en/playground`,
  },
  {
    output: "quickstart/index.html",
    source: "index.html",
    title: "Tracelet Quickstart · 从安装到第一个埋点",
    description: "通过完整 TypeScript 示例完成 Tracelet 安装、初始化、Consent、自动采集、框架接入与生产投递。",
    canonical: `${productionOrigin}/quickstart`,
    alternate: `${productionOrigin}/en/quickstart`,
  },
  {
    output: "examples/index.html",
    source: "index.html",
    title: "Tracelet 示例 · Transport、Storage、Protobuf 与插件",
    description: "可复制的 Tracelet 场景代码：Transport 路由、浏览器存储、Protobuf、gzip、插件组合和自定义 Adapter。",
    canonical: `${productionOrigin}/examples`,
    alternate: `${productionOrigin}/en/examples`,
  },
  {
    output: "reference/index.html",
    source: "index.html",
    title: "Tracelet API Reference · 浏览器埋点 SDK",
    description: "查询 Tracelet Analytics 方法、配置项、内置 Adapter、插件、高级对象和诊断事件。",
    canonical: `${productionOrigin}/reference`,
    alternate: `${productionOrigin}/en/reference`,
  },
  {
    output: "en/guides/backend-agnostic-analytics-sdk/index.html",
    source: "en/index.html",
    title: "Designing a backend-agnostic browser analytics SDK · Tracelet",
    description: "A practical architecture guide to stable contracts, durable queues, consent, codecs, compression and transport boundaries in a browser analytics SDK.",
    canonical: `${productionOrigin}/en/guides/backend-agnostic-analytics-sdk`,
    alternate: `${productionOrigin}/guides/backend-agnostic-analytics-sdk`,
    article: true,
  },
  {
    output: "en/guides/typescript-browser-analytics-sdk/index.html",
    source: "en/index.html",
    title: "Choose a TypeScript browser analytics SDK · Tracelet",
    description: "Evaluate typed events, privacy, durable offline queues, backend ownership and observability, then implement a production-minded Tracelet setup.",
    canonical: `${productionOrigin}/en/guides/typescript-browser-analytics-sdk`,
    alternate: `${productionOrigin}/guides/typescript-browser-analytics-sdk`,
    article: true,
  },
  {
    output: "en/playground/index.html",
    source: "en/index.html",
    title: "Tracelet Playground · Try the browser analytics SDK",
    description: "Run the real Tracelet SDK without a backend: create events, inspect the queue, simulate delivery failures and view EventBatch payloads.",
    canonical: `${productionOrigin}/en/playground`,
    alternate: `${productionOrigin}/playground`,
  },
  {
    output: "en/quickstart/index.html",
    source: "en/index.html",
    title: "Tracelet Quickstart · Send your first typed event",
    description: "Install and configure Tracelet with TypeScript, consent, autocapture, framework lifecycle and production delivery examples.",
    canonical: `${productionOrigin}/en/quickstart`,
    alternate: `${productionOrigin}/quickstart`,
  },
  {
    output: "en/examples/index.html",
    source: "en/index.html",
    title: "Tracelet Examples · Transports, storage, Protobuf and plugins",
    description: "Copy production-minded Tracelet recipes for routing, browser storage, Protobuf, gzip, plugin composition and custom adapters.",
    canonical: `${productionOrigin}/en/examples`,
    alternate: `${productionOrigin}/examples`,
  },
  {
    output: "en/reference/index.html",
    source: "en/index.html",
    title: "Tracelet API Reference · Browser analytics SDK",
    description: "Look up Tracelet Analytics methods, options, built-in adapters, plugins, advanced objects and diagnostic events.",
    canonical: `${productionOrigin}/en/reference`,
    alternate: `${productionOrigin}/reference`,
  },
] as const;

function replaceMeta(html: string, page: (typeof generatedPages)[number]): string {
  const english = page.output.startsWith("en/");
  const zhUrl = english ? page.alternate : page.canonical;
  const enUrl = english ? page.canonical : page.alternate;
  // Keep useful, equivalent content in the first HTTP response. React replaces
  // this fallback after loading, while crawlers without JavaScript still see a
  // descriptive heading, install command and crawlable internal links.
  const staticFallback = english
    ? `<main style="max-width:760px;margin:0 auto;padding:72px 24px;color:#e2e8f0;font-family:system-ui,sans-serif"><p style="color:#6ee7b7;font-family:monospace">Tracelet Browser · tracelet-browser</p><h1>${page.title.replace(" · Tracelet", "")}</h1><p>${page.description}</p><pre style="overflow:auto;padding:16px;border:1px solid #1e293b;border-radius:12px;background:#050809"><code>npm install tracelet-browser</code></pre><nav aria-label="Core documentation"><a href="/en/quickstart">Quickstart</a> · <a href="/en/playground">Playground</a> · <a href="/en/guides/typescript-browser-analytics-sdk">SDK evaluation guide</a> · <a href="/en/reference">API reference</a></nav></main>`
    : `<main style="max-width:760px;margin:0 auto;padding:72px 24px;color:#e2e8f0;font-family:system-ui,sans-serif"><p style="color:#6ee7b7;font-family:monospace">Tracelet Browser · tracelet-browser</p><h1>${page.title.replace(" · Tracelet", "")}</h1><p>${page.description}</p><pre style="overflow:auto;padding:16px;border:1px solid #1e293b;border-radius:12px;background:#050809"><code>npm install tracelet-browser</code></pre><nav aria-label="核心文档"><a href="/quickstart">快速开始</a> · <a href="/playground">在线体验</a> · <a href="/guides/typescript-browser-analytics-sdk">SDK 选型指南</a> · <a href="/reference">API Reference</a></nav></main>`;
  const articleJsonLd = "article" in page && page.article
    ? `<script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "TechArticle",
            headline: page.title.replace(" · Tracelet", ""),
            description: page.description,
            url: page.canonical,
            mainEntityOfPage: page.canonical,
            datePublished: "2026-10-20",
            dateModified: "2026-10-20",
            inLanguage: english ? "en" : "zh-CN",
            author: { "@type": "Organization", name: "Tracelet contributors" },
            about: ["TypeScript", "browser analytics SDK", "event tracking", "privacy", "offline queue"],
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Tracelet Browser", item: english ? `${productionOrigin}/en` : `${productionOrigin}/` },
              { "@type": "ListItem", position: 2, name: page.title.replace(" · Tracelet", ""), item: page.canonical },
            ],
          },
        ],
      })}</script>`
    : "";
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${page.title}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${page.description}" />`)
    .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${page.canonical}" />`)
    .replace(/<link rel="alternate" hreflang="zh-CN" href="[^"]*" \/>/, `<link rel="alternate" hreflang="zh-CN" href="${zhUrl}" />`)
    .replace(/<link rel="alternate" hreflang="en" href="[^"]*" \/>/, `<link rel="alternate" hreflang="en" href="${enUrl}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${page.title}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${page.description}" />`)
    .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${page.canonical}" />`)
    .replace(/<meta property="og:type" content="[^"]*" \/>/, `<meta property="og:type" content="${"article" in page && page.article ? "article" : "website"}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${page.title}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${page.description}" />`)
    .replace(/<!-- seo-fallback:start -->[\s\S]*?<!-- seo-fallback:end -->/, `<!-- seo-fallback:start -->${staticFallback}<!-- seo-fallback:end -->`)
    .replace("</head>", `${articleJsonLd}</head>`);
}

function staticDocumentationPages() {
  return {
    name: "tracelet-static-documentation-pages",
    apply: "build" as const,
    async closeBundle() {
      const outputRoot = fileURLToPath(new URL("../out", import.meta.url));
      const sources = new Map<string, string>();
      for (const page of generatedPages) {
        let html = sources.get(page.source);
        if (!html) {
          html = await readFile(join(outputRoot, page.source), "utf8");
          sources.set(page.source, html);
        }
        const output = join(outputRoot, page.output);
        await mkdir(dirname(output), { recursive: true });
        await writeFile(output, replaceMeta(html, page));
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), staticDocumentationPages()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    outDir: "../out",
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        en: fileURLToPath(new URL("./en/index.html", import.meta.url)),
      },
    },
  },
});
