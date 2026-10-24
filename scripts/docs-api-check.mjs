import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [analyticsDeclaration, contractsDeclaration, referenceSource] = await Promise.all([
  readFile(new URL("../dist/analytics.d.ts", import.meta.url), "utf8"),
  readFile(new URL("../dist/contracts.d.ts", import.meta.url), "utf8"),
  readFile(new URL("../website/src/components/api-reference.tsx", import.meta.url), "utf8"),
]);

const analyticsClass = analyticsDeclaration.match(
  /export declare class Analytics[\s\S]*?\n}\n/,
)?.[0];
assert.ok(analyticsClass, "Unable to locate the emitted Analytics declaration");

const methods = analyticsClass
  .split("\n")
  .filter((line) => /^ {4}[A-Za-z]/.test(line))
  .filter((line) => !line.trimStart().startsWith("private "))
  .map((line) => line.match(/^ {4}([A-Za-z][A-Za-z0-9_]*)[^;]*\(/)?.[1])
  .filter((name) => name !== undefined && name !== "constructor");

assert.ok(methods.length > 0, "No public Analytics methods were discovered");
for (const method of methods) {
  assert.ok(
    referenceSource.includes(`["${method}(`),
    `Website API Reference is missing Analytics.${method}()`,
  );
}

const diagnosticDeclaration = contractsDeclaration.match(
  /export type DiagnosticEvent =[\s\S]*?export type DiagnosticListener/,
)?.[0];
assert.ok(diagnosticDeclaration, "Unable to locate the emitted DiagnosticEvent declaration");

const diagnostics = [...diagnosticDeclaration.matchAll(/type: "([a-z0-9_-]+)"/g)]
  .map((match) => match[1]);
for (const event of diagnostics) {
  assert.ok(
    referenceSource.includes(`"${event}"`),
    `Website API Reference is missing DiagnosticEvent ${event}`,
  );
}

console.log(
  `Website API Reference covers ${methods.length} Analytics methods and ${diagnostics.length} diagnostic events`,
);

