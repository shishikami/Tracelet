import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const packageJson = JSON.parse(await readFile(join(repositoryRoot, "package.json"), "utf8"));
const temporaryProject = await mkdtemp(join(tmpdir(), "tracelet-package-smoke-"));
const tarballName = `${packageJson.name.replace("@", "").replace("/", "-")}-${packageJson.version}.tgz`;
const tarballPath = join(temporaryProject, tarballName);

function run(command, args, options = {}) {
  execFileSync(command, args, {
    cwd: temporaryProject,
    encoding: "utf8",
    stdio: "pipe",
    ...options,
  });
}

try {
  // Pack the exact artifact users will install, including prepack generation.
  run("npm", ["pack", "--silent", "--pack-destination", temporaryProject], {
    cwd: repositoryRoot,
  });
  await readFile(tarballPath);

  await writeFile(join(temporaryProject, "package.json"), JSON.stringify({
    name: "tracelet-package-smoke",
    private: true,
    type: "module",
  }, null, 2));
  run("npm", [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "--no-package-lock",
    tarballPath,
  ]);

  // Runtime smoke test catches broken package exports and missing build files.
  await writeFile(join(temporaryProject, "runtime.mjs"), `
    import {
      EventRouter,
      MemoryEventStorage,
      SDK_NAME,
      SDK_VERSION,
      createAnalytics,
      createAutoCapturePlugin,
      estimateBrowserStorage,
    } from "tracelet-browser";

    if (SDK_NAME !== "tracelet-browser") throw new Error("Unexpected SDK name");
    if (SDK_VERSION !== ${JSON.stringify(packageJson.version)}) throw new Error("Unexpected SDK version");
    if (typeof createAutoCapturePlugin !== "function") throw new Error("Missing autocapture export");
    if (typeof EventRouter !== "function") throw new Error("Missing event router export");
    if (typeof estimateBrowserStorage !== "function") throw new Error("Missing storage estimate export");

    const storage = new MemoryEventStorage();
    const analytics = createAnalytics({
      appId: "package-smoke",
      eventStorage: storage,
      pageLifecycle: false,
      transport: new EventRouter({
        routes: [],
        fallback: { name: "test", async send() { return { success: true }; } },
      }),
    });
    const diagnosticTypes = [];
    const unsubscribe = analytics.subscribeDiagnostics((event) => diagnosticTypes.push(event.type));
    await analytics.track("package_loaded", { source: "tarball" });
    const snapshot = await analytics.getQueueSnapshot();
    if (snapshot.pendingEvents !== 1) throw new Error("Installed package did not expose its queued event");
    if (!diagnosticTypes.includes("event_enqueued")) throw new Error("Installed package did not publish diagnostics");
    unsubscribe();
    await analytics.shutdown();
  `);
  run(process.execPath, [join(temporaryProject, "runtime.mjs")]);

  // Compile against the declarations resolved from the installed package.
  await writeFile(join(temporaryProject, "typed.ts"), `
    import {
      createAnalytics,
      type AnalyticsPlugin,
      type DiagnosticListener,
      type QueueSnapshot,
    } from "tracelet-browser";

    interface Events {
      checkout_completed: { orderId: string; amount: number };
    }

    const plugin: AnalyticsPlugin = { name: "smoke" };
    const analytics = createAnalytics<Events>({
      appId: "typed-smoke",
      plugins: [plugin],
      transport: { name: "test", async send() { return { success: true }; } },
    });
    const listener: DiagnosticListener = (event) => console.info(event.type);
    const unsubscribe = analytics.subscribeDiagnostics(listener);
    await analytics.track("checkout_completed", { orderId: "o_1", amount: 99 });
    const snapshot: QueueSnapshot = await analytics.getQueueSnapshot();
    console.info(snapshot.pendingEvents, snapshot.delivery.phase);
    unsubscribe();
  `);
  await writeFile(join(temporaryProject, "tsconfig.json"), JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      strict: true,
      noEmit: true,
      skipLibCheck: true,
    },
    include: ["typed.ts"],
  }, null, 2));
  run(process.execPath, [
    join(repositoryRoot, "node_modules/typescript/bin/tsc"),
    "-p",
    join(temporaryProject, "tsconfig.json"),
  ]);

  // Build a minimal consumer app to catch bundler resolution regressions.
  await mkdir(join(temporaryProject, "src"));
  await writeFile(join(temporaryProject, "index.html"), '<div id="app"></div><script type="module" src="/src/main.ts"></script>');
  await writeFile(join(temporaryProject, "src/main.ts"), `
    import { createAnalytics, createAutoCapturePlugin } from "tracelet-browser";
    const analytics = createAnalytics({
      appId: "vite-smoke",
      plugins: [createAutoCapturePlugin({ pageViews: true, errors: true })],
      transport: { name: "test", async send() { return { success: true }; } },
    });
    await analytics.init();
    document.querySelector("#app").textContent = "Tracelet loaded";
  `);
  run(process.execPath, [
    join(repositoryRoot, "website/node_modules/vite/bin/vite.js"),
    "build",
  ]);

  const builtHtml = await readFile(join(temporaryProject, "dist/index.html"), "utf8");
  assert.match(builtHtml, /assets\/index-/);
  console.log(`Package smoke test passed for ${packageJson.name}@${packageJson.version}`);
} finally {
  await rm(temporaryProject, { recursive: true, force: true });
}
