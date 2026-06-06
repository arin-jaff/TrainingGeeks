#!/usr/bin/env node
/**
 * Screenshot harness for visual iteration against the reference UI.
 *   node scripts/shoot.mjs <url> <outfile> [waitMs]
 * Captures a 1440x900 viewport screenshot. Uses --no-sandbox so it runs in
 * restricted/CI environments.
 */
import { chromium } from "playwright";

const [, , url, out, waitMs = "2500"] = process.argv;
if (!url || !out) {
  console.error("usage: node scripts/shoot.mjs <url> <outfile> [waitMs]");
  process.exit(1);
}

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: "networkidle" }).catch(() => {});
await page.waitForTimeout(Number(waitMs));
await page.screenshot({ path: out });
await browser.close();
console.log(`saved ${out}`);
