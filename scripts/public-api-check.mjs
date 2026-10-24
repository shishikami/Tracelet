import assert from "node:assert/strict";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";

const expected = JSON.parse(
  await readFile(new URL("../tests/fixtures/public-exports.json", import.meta.url), "utf8"),
);
const actual = Object.keys(await import("../dist/index.js")).sort();

assert.deepEqual(
  actual,
  expected,
  [
    "Public runtime exports changed.",
    "If this is intentional, update tests/fixtures/public-exports.json and document the API change.",
  ].join(" "),
);

console.log(`Public API snapshot passed (${actual.length} runtime exports)`);

const declarationRoot = new URL("../dist/", import.meta.url);
const declarationFixture = new URL("../tests/fixtures/public-types.json", import.meta.url);
const declarations = await collectDeclarations(declarationRoot);

if (process.argv.includes("--update")) {
  await writeFile(declarationFixture, `${JSON.stringify(declarations, null, 2)}\n`);
  console.log(`Updated public declaration snapshot (${Object.keys(declarations).length} files)`);
} else {
  const expectedDeclarations = JSON.parse(await readFile(declarationFixture, "utf8"));
  assert.deepEqual(
    declarations,
    expectedDeclarations,
    [
      "Public TypeScript declarations changed.",
      "If the change is intentional and SemVer-compatible, run: pnpm api:update",
      "Then review tests/fixtures/public-types.json and document the API change.",
    ].join(" "),
  );
  console.log(`Public declaration snapshot passed (${Object.keys(declarations).length} files)`);
}

async function collectDeclarations(root) {
  const rootPath = fileURLToPath(root);
  const entries = {};

  async function visit(directory) {
    const items = await readdir(directory, { withFileTypes: true });
    for (const item of items.sort((left, right) => left.name.localeCompare(right.name))) {
      const path = `${directory}/${item.name}`;
      if (item.isDirectory()) {
        await visit(path);
      } else if (item.isFile() && item.name.endsWith(".d.ts")) {
        const key = relative(rootPath, path).replaceAll("\\", "/");
        const contents = await readFile(path, "utf8");
        entries[key] = normalizeDeclaration(key, contents);
      }
    }
  }

  await visit(rootPath.replace(/\/$/, ""));
  return entries;
}

function normalizeDeclaration(path, contents) {
  const normalized = contents.replaceAll("\r\n", "\n").trimEnd() + "\n";
  if (path !== "version.d.ts") return normalized;
  // The version literal changes on every release but does not alter the API
  // shape. Runtime metadata is verified separately by version:check.
  return normalized.replace(
    /SDK_VERSION = "[^"]+"/,
    'SDK_VERSION = "<package-version>"',
  );
}
