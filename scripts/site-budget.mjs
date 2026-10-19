import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outputRoot = join(repositoryRoot, "out");
const manifest = JSON.parse(
  await readFile(join(outputRoot, ".vite", "manifest.json"), "utf8"),
);
const MAX_INITIAL_GZIP_BYTES = 125 * 1024;
const MAX_TOTAL_JAVASCRIPT_GZIP_BYTES = 170 * 1024;

const initialFiles = new Set();
const visit = (key) => {
  const chunk = manifest[key];
  assert.ok(chunk, `Missing Vite manifest entry: ${key}`);
  if (chunk.file) initialFiles.add(chunk.file);
  for (const cssFile of chunk.css ?? []) initialFiles.add(cssFile);
  for (const imported of chunk.imports ?? []) visit(imported);
};

const entryKeys = Object.entries(manifest)
  .filter(([, chunk]) => chunk.file?.endsWith(".js") && !chunk.isDynamicEntry)
  .map(([key]) => key);
assert.ok(entryKeys.length > 0, "Vite manifest does not contain a JavaScript entry");
for (const key of entryKeys) {
  visit(key);
}

async function gzipSize(relativePath) {
  return gzipSync(await readFile(join(outputRoot, relativePath))).byteLength;
}

let initialGzipBytes = 0;
for (const file of initialFiles) initialGzipBytes += await gzipSize(file);

async function walk(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relativePath = join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await walk(join(directory, entry.name), relativePath));
    else files.push(relativePath);
  }
  return files;
}

const javascriptFiles = (await walk(outputRoot)).filter((file) => file.endsWith(".js"));
let totalJavaScriptGzipBytes = 0;
for (const file of javascriptFiles) totalJavaScriptGzipBytes += await gzipSize(file);

assert.ok(
  initialGzipBytes <= MAX_INITIAL_GZIP_BYTES,
  `Initial website assets are ${initialGzipBytes} gzip bytes; budget is ${MAX_INITIAL_GZIP_BYTES}`,
);
assert.ok(
  totalJavaScriptGzipBytes <= MAX_TOTAL_JAVASCRIPT_GZIP_BYTES,
  `Website JavaScript is ${totalJavaScriptGzipBytes} gzip bytes; budget is ${MAX_TOTAL_JAVASCRIPT_GZIP_BYTES}`,
);

console.log(
  `Website budget passed: ${initialGzipBytes} B initial gzip, ` +
  `${totalJavaScriptGzipBytes} B total JavaScript gzip`,
);
