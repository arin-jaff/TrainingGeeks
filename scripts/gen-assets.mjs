#!/usr/bin/env node
/**
 * Generate the TrainingGeeks brand mark as a real PNG via the OpenAI image API.
 * Efficient + simple: ONE generation, reused for the nav logo and the favicon.
 *
 *   OPENAI_API_KEY=sk-... node scripts/gen-assets.mjs
 *
 * Writes public/logo.png and src/app/icon.png, and records the asset in
 * assets/asset_manifest.json (prompt + model + date).
 */
import { writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const key = process.env.OPENAI_API_KEY;
if (!key) {
  console.error("Set OPENAI_API_KEY (in .env.local) before running.");
  process.exit(1);
}

const PROMPT = [
  "A minimal, modern app icon for a training-analytics app called TrainingGeeks.",
  "A single clean upward trend line that reads as a rising fitness curve,",
  "centered inside a rounded square. Deep navy background (#0F1B33),",
  "bright blue line (#2F6FED) with one small white endpoint dot.",
  "Flat vector style, high contrast, no text, no gradients, simple and crisp.",
].join(" ");

const root = process.cwd();

async function main() {
  console.log("Requesting image (gpt-image-1, 1024x1024)…");
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt: PROMPT,
      size: "1024x1024",
      n: 1,
    }),
  });
  if (!res.ok) {
    console.error("Image API error:", res.status, await res.text());
    process.exit(1);
  }
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) {
    console.error("No image returned:", JSON.stringify(data).slice(0, 400));
    process.exit(1);
  }
  const png = Buffer.from(b64, "base64");

  writeFileSync(join(root, "public", "logo.png"), png);
  // Next.js uses app/icon.png as the favicon; replace the SVG placeholder.
  writeFileSync(join(root, "src", "app", "icon.png"), png);
  const svgIcon = join(root, "src", "app", "icon.svg");
  if (existsSync(svgIcon)) rmSync(svgIcon);

  // Record in the asset manifest.
  const manifestPath = join(root, "assets", "asset_manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest.assets = (manifest.assets ?? []).filter(
    (a) => a.file !== "public/logo.png" && a.file !== "src/app/icon.png",
  );
  const date = new Date().toISOString().slice(0, 10);
  manifest.assets.push(
    {
      file: "public/logo.png",
      type: "logo",
      origin: "generated",
      source_url: null,
      license: "AI-generated (OpenAI gpt-image-1), owned by arin-jaff",
      prompt: PROMPT,
      added: date,
      notes: "Nav wordmark icon.",
    },
    {
      file: "src/app/icon.png",
      type: "favicon",
      origin: "generated",
      source_url: null,
      license: "AI-generated (OpenAI gpt-image-1), owned by arin-jaff",
      prompt: PROMPT,
      added: date,
      notes: "Next.js app icon (favicon), same generated mark.",
    },
  );
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

  console.log("Wrote public/logo.png, src/app/icon.png, updated manifest.");
}

main();
