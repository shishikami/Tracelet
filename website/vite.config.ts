import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const productionOrigin = "https://tracelet-opal.vercel.app";
const generatedPages = [
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
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${page.title}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${page.description}" />`)
    .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${page.canonical}" />`)
    .replace(/<link rel="alternate" hreflang="zh-CN" href="[^"]*" \/>/, `<link rel="alternate" hreflang="zh-CN" href="${zhUrl}" />`)
    .replace(/<link rel="alternate" hreflang="en" href="[^"]*" \/>/, `<link rel="alternate" hreflang="en" href="${enUrl}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${page.title}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${page.description}" />`)
    .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${page.canonical}" />`);
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
