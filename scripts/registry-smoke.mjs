import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const packageJson = JSON.parse(await readFile(join(repositoryRoot, "package.json"), "utf8"));
const packageSpec = process.env.TRACELET_PACKAGE_SPEC ?? `${packageJson.name}@${packageJson.version}`;
const expectedVersion = process.env.TRACELET_EXPECTED_VERSION ?? packageJson.version;
const temporaryProject = await mkdtemp(join(tmpdir(), "tracelet-registry-smoke-"));
const registryAttempts = Number(process.env.TRACELET_REGISTRY_ATTEMPTS ?? 60);

assert.ok(
  Number.isSafeInteger(registryAttempts) && registryAttempts > 0,
  "TRACELET_REGISTRY_ATTEMPTS must be a positive integer",
);

async function run(command, args, options = {}) {
  return execFileAsync(command, args, {
    cwd: temporaryProject,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    ...options,
  });
}

async function waitForPublishedVersion() {
  let lastError;
  for (let attempt = 1; attempt <= registryAttempts; attempt += 1) {
    try {
      const { stdout } = await run("npm", ["view", packageSpec, "version", "--json"]);
      const value = JSON.parse(stdout);
      const version = Array.isArray(value) ? value.at(-1) : value;
      assert.equal(version, expectedVersion, `${packageSpec} resolved to ${version}`);
      return;
    } catch (error) {
      lastError = error;
      if (attempt === registryAttempts) break;
      console.log(`[registry] ${packageSpec} is not visible yet (${attempt}/${registryAttempts}); retrying in 5s`);
      await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
  }
  throw lastError;
}

try {
  // npm's staged publish can finish before every registry edge sees the new
  // version, so wait for the exact immutable version rather than a dist-tag.
  await waitForPublishedVersion();

  await writeFile(join(temporaryProject, "package.json"), JSON.stringify({
    name: "tracelet-registry-smoke",
    private: true,
    type: "module",
    dependencies: {
      [packageJson.name]: expectedVersion,
    },
    devDependencies: {
      typescript: "5.9.3",
    },
  }, null, 2));
  await run("npm", [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "--no-package-lock",
  ]);

  // Execute from the clean project so Node resolves the package from the
  // public npm registry rather than this repository's workspace.
  await writeFile(join(temporaryProject, "runtime.mjs"), `
    import assert from "node:assert/strict";
    import { createServer } from "node:http";
    import {
      HttpTransport,
      MemoryEventStorage,
      SDK_NAME,
      SDK_VERSION,
      createAnalytics,
    } from "tracelet-browser";

    assert.equal(SDK_NAME, "tracelet-browser");
    assert.equal(SDK_VERSION, ${JSON.stringify(expectedVersion)});

    const received = [];
    const server = createServer((request, response) => {
      const chunks = [];
      request.on("data", (chunk) => chunks.push(chunk));
      request.on("end", () => {
        received.push(JSON.parse(Buffer.concat(chunks).toString("utf8")));
        response.writeHead(202, { "content-type": "application/json" });
        response.end('{"accepted":true}');
      });
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Collector did not bind to TCP");

    const analytics = createAnalytics({
      appId: "registry-smoke",
      eventStorage: new MemoryEventStorage(),
      pageLifecycle: false,
      transport: new HttpTransport({
        endpoint: \`http://127.0.0.1:\${address.port}/events\`,
      }),
    });

    try {
      await analytics.track("registry_package_loaded", { source: "npm" });
      await analytics.flush();
      assert.equal(received.length, 1);
      assert.equal(received[0].events.length, 1);
      assert.equal(received[0].events[0].name, "registry_package_loaded");
      assert.equal((await analytics.getQueueSnapshot()).pendingEvents, 0);
      await analytics.shutdown();
    } finally {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  `);
  await run(process.execPath, [join(temporaryProject, "runtime.mjs")]);

  // Resolve and compile declarations from the installed registry package.
  await writeFile(join(temporaryProject, "typed.ts"), `
    import {
      HttpTransport,
      IndexedDbEventStorage,
      createAnalytics,
      type DiagnosticListener,
    } from "tracelet-browser";

    interface Events {
      checkout_completed: { orderId: string; amount: number };
    }

    const eventStorage = new IndexedDbEventStorage();
    const analytics = createAnalytics<Events>({
      appId: "registry-typed-smoke",
      eventStorage,
      transport: new HttpTransport({ endpoint: "https://collector.example.com/events" }),
    });
    const listener: DiagnosticListener = (event) => console.info(event.type);
    const unsubscribe = analytics.subscribeDiagnostics(listener);
    await analytics.track("checkout_completed", { orderId: "o_1", amount: 99 });
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
  await run(process.execPath, [
    join(temporaryProject, "node_modules/typescript/bin/tsc"),
    "-p",
    join(temporaryProject, "tsconfig.json"),
  ]);

  console.log(`Registry smoke test passed for ${packageSpec}`);
} finally {
  await rm(temporaryProject, { recursive: true, force: true });
}
