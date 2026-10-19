import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const siteUrl = "https://tracelet-opal.vercel.app/";
const readOutput = (name) => readFile(new URL(`../out/${name}`, import.meta.url), "utf8");

const [html, robots, sitemap, llms, llmsFull] = await Promise.all([
  readOutput("index.html"),
  readOutput("robots.txt"),
  readOutput("sitemap.xml"),
  readOutput("llms.txt"),
  readOutput("llms-full.txt"),
]);

assert.match(html, new RegExp(`<link rel="canonical" href="${siteUrl}"`));
assert.match(html, /<meta property="og:title"/);
assert.match(html, /<meta name="twitter:card"/);

const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
assert.ok(jsonLd, "JSON-LD structured data is missing");
const graph = JSON.parse(jsonLd)["@graph"];
assert.ok(graph.some((entry) => entry["@type"] === "WebSite"));
assert.ok(graph.some((entry) => entry["@type"] === "SoftwareApplication"));

assert.match(robots, /Sitemap: https:\/\/tracelet-opal\.vercel\.app\/sitemap\.xml/);
assert.match(sitemap, /<loc>https:\/\/tracelet-opal\.vercel\.app\/<\/loc>/);
assert.match(llms, /llms-full\.txt/);
assert.match(llmsFull, /npm install tracelet-browser/);

console.log("SEO/GEO output validation passed");
