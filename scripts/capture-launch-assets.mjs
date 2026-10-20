import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.env.TRACELET_CAPTURE_BASE_URL ?? "http://127.0.0.1:4318";
const outputDirectory = resolve("docs/launch-assets");

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  colorScheme: "dark",
});

async function open(path) {
  await page.goto(new URL(path, baseUrl).toString(), { waitUntil: "networkidle" });
}

try {
  await open("/en/playground");
  await page.getByRole("button", { name: "track()" }).click();
  await page.getByRole("button", { name: "Fail next request" }).click();
  await page.getByRole("button", { name: "Flush queue" }).click();
  await page.getByText("Mock collector returned 503").waitFor();
  await page.getByText("01 / Event builder").evaluate((heading) => {
    const content = heading.closest("section");
    const contentTop = (content?.getBoundingClientRect().top ?? 0) + window.scrollY;
    window.scrollTo({ top: Math.max(0, contentTop - 64), behavior: "instant" });
  });
  await page.screenshot({
    path: resolve(outputDirectory, "playground-retry.png"),
    animations: "disabled",
  });

  await open("/en/guides/backend-agnostic-analytics-sdk");
  await page.getByRole("heading", { name: "Designing a backend-agnostic browser analytics SDK" }).waitFor();
  await page.screenshot({
    path: resolve(outputDirectory, "architecture-guide.png"),
    animations: "disabled",
  });

  await open("/en/examples#starters");
  await page.locator("#starters").scrollIntoViewIfNeeded();
  await page.getByRole("heading", { name: "Runnable starters" }).waitFor();
  await page.screenshot({
    path: resolve(outputDirectory, "runnable-starters.png"),
    animations: "disabled",
  });
} finally {
  await browser.close();
}

console.log(`Launch assets captured from ${baseUrl} in ${outputDirectory}`);
