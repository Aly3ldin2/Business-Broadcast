/**
 * Generates all PWA / favicon PNGs from the master SVG.
 * Run: node artifacts/wa-broadcast/scripts/gen-icons.mjs
 *
 * Keep geometry in sync with src/components/brand-logo.tsx.
 */
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir    = dirname(fileURLToPath(import.meta.url));
const iconsDir = resolve(__dir, "../public/icons");

function buildSvg(size) {
  return `
<svg width="${size}" height="${size}" viewBox="0 0 64 64"
     fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stop-color="#0D3D36"/>
      <stop offset="50%"  stop-color="#128C7E"/>
      <stop offset="100%" stop-color="#25D366"/>
    </linearGradient>
    <radialGradient id="s" cx="75%" cy="15%" r="50%">
      <stop offset="0%"   stop-color="#fff" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="64" height="64" rx="14" fill="url(#g)"/>
  <rect width="64" height="64" rx="14" fill="url(#s)"/>

  <!-- Megaphone body -->
  <rect x="8" y="26" width="14" height="12" rx="2" fill="white"/>

  <!-- Horn — opens right -->
  <polygon points="22,26 22,38 38,50 38,14" fill="white"/>

  <!-- Handle -->
  <rect x="9" y="38" width="9" height="13" rx="4.5" fill="white"/>

  <!-- Sound wave arcs -->
  <path d="M 42 24 A 8 8 0 0 1 42 40"
        stroke="white" stroke-width="3.5" stroke-linecap="round" fill="none" opacity="1"/>
  <path d="M 46 20 A 12 12 0 0 1 46 44"
        stroke="white" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.65"/>
  <path d="M 50 16 A 16 16 0 0 1 50 48"
        stroke="white" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.35"/>
</svg>`.trim();
}

const targets = [
  { name: "favicon-16.png",       size: 16  },
  { name: "favicon-32.png",       size: 32  },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "icon-192.png",         size: 192 },
  { name: "icon-512.png",         size: 512 },
];

for (const { name, size } of targets) {
  const resvg = new Resvg(buildSvg(size), { fitTo: { mode: "width", value: size } });
  writeFileSync(resolve(iconsDir, name), resvg.render().asPng());
  console.log(`✓  ${name}  (${size}×${size})`);
}

console.log("\nDone.");
