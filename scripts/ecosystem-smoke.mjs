import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const packageJson = JSON.parse(await readFile(join(repositoryRoot, "package.json"), "utf8"));
const temporaryRoot = await mkdtemp(join(tmpdir(), "tracelet-ecosystem-smoke-"));
const npmCache = join(tmpdir(), "tracelet-ecosystem-npm-cache");
const tarballName = `${packageJson.name.replace("@", "").replace("/", "-")}-${packageJson.version}.tgz`;
const tarballPath = join(temporaryRoot, tarballName);

const environment = {
  ...process.env,
  NEXT_TELEMETRY_DISABLED: "1",
  npm_config_cache: npmCache,
};

function run(label, command, args, cwd = temporaryRoot) {
  console.log(`\n[ecosystem] ${label}`);
  execFileSync(command, args, {
    cwd,
    env: environment,
    stdio: "inherit",
  });
}

async function assertArtifact(path, label) {
  const metadata = await stat(path);
  assert.ok(metadata.isFile() && metadata.size > 0, `${label} did not produce ${path}`);
}

try {
  // The regular quality job has already built and type-checked the package.
  // Ignore lifecycle scripts here so the smoke test consumes that exact dist/.
  run("pack current Tracelet artifact", "npm", [
    "pack",
    "--silent",
    "--ignore-scripts",
    "--pack-destination",
    temporaryRoot,
  ], repositoryRoot);
  await readFile(tarballPath);

  await writeFile(join(temporaryRoot, "package.json"), JSON.stringify({
    name: "tracelet-ecosystem-smoke",
    private: true,
    type: "module",
    dependencies: {
      "tracelet-browser": `file:./${tarballName}`,
      "react": "19.3.1",
      "react-dom": "19.3.1",
      "vue": "3.5.44",
    },
    devDependencies: {
      "@rollup/plugin-node-resolve": "16.0.3",
      "@types/react": "19.3.0",
      "@types/react-dom": "19.3.0",
      "@vitejs/plugin-react": "6.1.2",
      "@vitejs/plugin-vue": "6.0.10",
      "rollup": "4.65.0",
      "typescript": "5.9.3",
      "vite": "8.3.5",
      "vue-tsc": "3.3.13",
      "webpack": "5.112.1",
      "webpack-cli": "7.2.3",
    },
  }, null, 2));

  run("install pinned framework and bundler fixtures", "npm", [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "--no-package-lock",
  ]);

  const reactFixture = join(temporaryRoot, "react-vite");
  const vueFixture = join(temporaryRoot, "vue-vite");
  const nextFixture = join(temporaryRoot, "nextjs");
  await cp(join(repositoryRoot, "examples/starters/react-vite"), reactFixture, { recursive: true });
  await cp(join(repositoryRoot, "examples/starters/vue-vite"), vueFixture, { recursive: true });
  await cp(join(repositoryRoot, "examples/starters/nextjs"), nextFixture, { recursive: true });

  run("build React + Vite starter", process.execPath, [
    join(temporaryRoot, "node_modules/vite/bin/vite.js"),
    "build",
  ], reactFixture);
  await assertArtifact(join(reactFixture, "dist/index.html"), "React + Vite");

  run("type-check Vue starter", process.execPath, [
    join(temporaryRoot, "node_modules/vue-tsc/bin/vue-tsc.js"),
    "-p",
    join(vueFixture, "tsconfig.json"),
    "--noEmit",
  ], vueFixture);
  run("build Vue + Vite starter", process.execPath, [
    join(temporaryRoot, "node_modules/vite/bin/vite.js"),
    "build",
  ], vueFixture);
  await assertArtifact(join(vueFixture, "dist/index.html"), "Vue + Vite");

  // Next/Turbopack intentionally requires framework dependencies inside the
  // application root. Install this fixture independently and replace only the
  // SDK dependency with the tarball produced above.
  const nextPackagePath = join(nextFixture, "package.json");
  const nextPackage = JSON.parse(await readFile(nextPackagePath, "utf8"));
  nextPackage.dependencies[packageJson.name] = `file:${tarballPath}`;
  await writeFile(nextPackagePath, JSON.stringify(nextPackage, null, 2));
  run("install standalone Next.js fixture", "npm", [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "--no-package-lock",
  ], nextFixture);
  run("build Next.js production application", process.execPath, [
    join(nextFixture, "node_modules/next/dist/bin/next"),
    "build",
  ], nextFixture);
  await assertArtifact(join(nextFixture, "out/index.html"), "Next.js");

  const webpackFixture = join(temporaryRoot, "webpack-consumer");
  await mkdir(join(webpackFixture, "src"), { recursive: true });
  await writeFile(join(webpackFixture, "src/index.js"), `
    import { ConsoleTransport, createAnalytics } from "tracelet-browser";
    const analytics = createAnalytics({
      appId: "webpack-smoke",
      pageLifecycle: false,
      transport: new ConsoleTransport(),
    });
    export { analytics };
  `);
  await writeFile(join(webpackFixture, "webpack.config.cjs"), `
    const path = require("node:path");
    module.exports = {
      mode: "production",
      target: "web",
      entry: "./src/index.js",
      output: { path: path.resolve(__dirname, "dist"), filename: "bundle.js" },
    };
  `);
  run("bundle Webpack consumer", process.execPath, [
    join(temporaryRoot, "node_modules/webpack-cli/bin/cli.js"),
    "--config",
    join(webpackFixture, "webpack.config.cjs"),
  ], webpackFixture);
  await assertArtifact(join(webpackFixture, "dist/bundle.js"), "Webpack");

  const rollupFixture = join(temporaryRoot, "rollup-consumer");
  await mkdir(join(rollupFixture, "src"), { recursive: true });
  await writeFile(join(rollupFixture, "src/index.js"), `
    import { ConsoleTransport, createAnalytics } from "tracelet-browser";
    export const analytics = createAnalytics({
      appId: "rollup-smoke",
      pageLifecycle: false,
      transport: new ConsoleTransport(),
    });
  `);
  await writeFile(join(rollupFixture, "rollup.config.mjs"), `
    import { nodeResolve } from "@rollup/plugin-node-resolve";
    export default {
      input: "src/index.js",
      output: { file: "dist/bundle.js", format: "es" },
      plugins: [nodeResolve({ browser: true })],
    };
  `);
  run("bundle Rollup consumer", process.execPath, [
    join(temporaryRoot, "node_modules/rollup/dist/bin/rollup"),
    "--config",
    join(rollupFixture, "rollup.config.mjs"),
  ], rollupFixture);
  await assertArtifact(join(rollupFixture, "dist/bundle.js"), "Rollup");

  console.log("\nEcosystem smoke test passed: React, Vue, Next.js, Webpack and Rollup");
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
