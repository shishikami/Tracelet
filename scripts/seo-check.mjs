import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const siteUrl = "https://tracelet-opal.vercel.app/";
const readOutput = (name) => readFile(new URL(`../out/${name}`, import.meta.url), "utf8");

const [html, englishHtml, quickstartHtml, examplesHtml, referenceHtml, englishQuickstartHtml, robots, sitemap, llms, llmsFull] = await Promise.all([
  readOutput("index.html"),
  readOutput("en/index.html"),
  readOutput("quickstart/index.html"),
  readOutput("examples/index.html"),
  readOutput("reference/index.html"),
  readOutput("en/quickstart/index.html"),
  readOutput("robots.txt"),
  readOutput("sitemap.xml"),
  readOutput("llms.txt"),
  readOutput("llms-full.txt"),
]);

assert.match(html, new RegExp(`<link rel="canonical" href="${siteUrl}"`));
assert.match(html, /<meta name="google-site-verification" content="[A-Za-z0-9_-]+"/);
assert.match(html, /hreflang="en" href="https:\/\/tracelet-opal\.vercel\.app\/en"/);
assert.match(html, /<meta property="og:title"/);
assert.match(html, /<meta name="twitter:card"/);
assert.match(englishHtml, /<html lang="en"/);
assert.match(englishHtml, /<link rel="canonical" href="https:\/\/tracelet-opal\.vercel\.app\/en"/);
assert.match(englishHtml, /hreflang="zh-CN" href="https:\/\/tracelet-opal\.vercel\.app\/"/);
assert.match(quickstartHtml, /<link rel="canonical" href="https:\/\/tracelet-opal\.vercel\.app\/quickstart"/);
assert.match(quickstartHtml, /hreflang="en" href="https:\/\/tracelet-opal\.vercel\.app\/en\/quickstart"/);
assert.match(examplesHtml, /<link rel="canonical" href="https:\/\/tracelet-opal\.vercel\.app\/examples"/);
assert.match(referenceHtml, /<link rel="canonical" href="https:\/\/tracelet-opal\.vercel\.app\/reference"/);
assert.match(englishQuickstartHtml, /<html lang="en"/);
assert.match(englishQuickstartHtml, /hreflang="zh-CN" href="https:\/\/tracelet-opal\.vercel\.app\/quickstart"/);

const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
assert.ok(jsonLd, "JSON-LD structured data is missing");
const graph = JSON.parse(jsonLd)["@graph"];
assert.ok(graph.some((entry) => entry["@type"] === "WebSite"));
assert.ok(graph.some((entry) => entry["@type"] === "SoftwareApplication"));

assert.match(robots, /Sitemap: https:\/\/tracelet-opal\.vercel\.app\/sitemap\.xml/);
assert.match(sitemap, /<loc>https:\/\/tracelet-opal\.vercel\.app\/<\/loc>/);
assert.match(sitemap, /<loc>https:\/\/tracelet-opal\.vercel\.app\/en<\/loc>/);
for (const route of ["quickstart", "examples", "reference", "en/quickstart", "en/examples", "en/reference"]) {
  assert.match(sitemap, new RegExp(`<loc>https://tracelet-opal\\.vercel\\.app/${route}</loc>`));
}
assert.match(llms, /llms-full\.txt/);
assert.match(llmsFull, /npm install tracelet-browser/);

console.log("SEO/GEO output validation passed");
