import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const MAX_TARBALL_BYTES = 48 * 1024;
const MAX_UNPACKED_BYTES = 175 * 1024;
const MAX_FILE_COUNT = 72;
const REQUIRED_FILES = [
  "CHANGELOG.md",
  "LICENSE",
  "README.md",
  "dist/index.d.ts",
  "dist/index.js",
  "package.json",
];

const output = execFileSync(
  "npm",
  ["pack", "--dry-run", "--json", "--ignore-scripts"],
  { cwd: repositoryRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
);
const [report] = JSON.parse(output);

assert.ok(report, "npm pack did not return a package report");
assert.ok(
  report.size <= MAX_TARBALL_BYTES,
  `Package tarball is ${report.size} bytes; budget is ${MAX_TARBALL_BYTES} bytes`,
);
assert.ok(
  report.unpackedSize <= MAX_UNPACKED_BYTES,
  `Unpacked package is ${report.unpackedSize} bytes; budget is ${MAX_UNPACKED_BYTES} bytes`,
);
assert.ok(
  report.entryCount <= MAX_FILE_COUNT,
  `Package contains ${report.entryCount} files; budget is ${MAX_FILE_COUNT}`,
);

const paths = new Set(report.files.map((file) => file.path));
for (const required of REQUIRED_FILES) {
  assert.ok(paths.has(required), `Required package file is missing: ${required}`);
}

const unexpected = [...paths].filter(
  (path) =>
    !path.startsWith("dist/") &&
    !["CHANGELOG.md", "LICENSE", "README.md", "package.json"].includes(path),
);
assert.deepEqual(unexpected, [], `Unexpected files would be published: ${unexpected.join(", ")}`);

console.log(
  `Package budget passed: ${report.size} B compressed, ` +
  `${report.unpackedSize} B unpacked, ${report.entryCount} files`,
);
