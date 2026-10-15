import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const source = fileURLToPath(new URL("../docs/", import.meta.url));
const output = fileURLToPath(new URL("../site/", import.meta.url));
const outputAssets = fileURLToPath(new URL("../site/docs/", import.meta.url));

await rm(output, { recursive: true, force: true });
await mkdir(outputAssets, { recursive: true });
await cp(source, outputAssets, { recursive: true });
await cp(new URL("../docs/index.html", import.meta.url), new URL("../site/index.html", import.meta.url));

console.log(`Documentation site built: ${output.replace(projectRoot, "./")}`);
