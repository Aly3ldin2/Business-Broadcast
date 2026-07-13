/**
 * Generates all PWA / favicon PNG files from the SVG icon definition.
 * Run: node artifacts/wa-broadcast/scripts/gen-icons.mjs
 */

import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const iconsDir = resolve(__dir, "../public/icons");

// ─── SVG source (must stay in sync with brand-logo.tsx) ──────────────────────
function buildSvg(size) {
  const r = size * (14 / 64);   // corner radius proportional to 14/64
  const scale = size / 64;

  // All coordinates are in the 64×64 viewBox; SVG handles scaling.
  return `
<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#2EE076"/>
      <stop offset="100%" stop-color="#075E54"/>
    </linearGradient>
  </defs>

  <rect width="64" height="64" rx="${14}" fill="url(#bg)"/>

  <!-- Dot -->
  <circle cx="16" cy="32" r="5" fill="white"/>

  <!-- Arc 1 - inner -->
  <path d="M 23.1 24.9 A 10 10 0 0 1 23.1 39.1"
        stroke="white" stroke-width="4" stroke-linecap="round" fill="none"/>

  <!-- Arc 2 - middle -->
  <path d="M 27.5 18.4 A 17 17 0 0 1 27.5 45.6"
        stroke="white" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.7"/>

  <!-- Arc 3 - outer -->
  <path d="M 31.1 12.1 A 24 24 0 0 1 31.1 51.9"
        stroke="white" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.4"/>
</svg>`.trim();
}

// ─── Sizes to generate ────────────────────────────────────────────────────────
const targets = [
  { name: "favicon-16.png",        size: 16 },
  { name: "favicon-32.png",        size: 32 },
  { name: "apple-touch-icon.png",  size: 180 },
  { name: "icon-192.png",          size: 192 },
  { name: "icon-512.png",          size: 512 },
];

for (const { name, size } of targets) {
  const svg = buildSvg(size);
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
  });
  const png = resvg.render().asPng();
  const out = resolve(iconsDir, name);
  writeFileSync(out, png);
  console.log(`✓ ${name} (${size}×${size})`);
}

console.log("\nAll icons generated.");
