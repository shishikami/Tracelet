import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

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
