/**
 * Generates all PWA / favicon PNGs from the SVG icon.
 * Run: node artifacts/wa-broadcast/scripts/gen-icons.mjs
 *
 * Keep geometry in sync with brand-logo.tsx.
 * Static IDs are fine here — each file is a standalone SVG document.
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
    <linearGradient id="g" x1="0" y1="0" x2="64" y2="64"
                    gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stop-color="#2ECC71"/>
      <stop offset="100%" stop-color="#25D366"/>
    </linearGradient>
  </defs>

  <!-- Green rounded square -->
  <rect width="64" height="64" rx="14" fill="url(#g)"/>

  <!-- White speech bubble: circle + WA-style tail -->
  <circle cx="33" cy="25" r="21" fill="white"/>
  <polygon points="14,34 7,57 22,43" fill="white"/>

  <!-- Broadcast signal (carved in green = WA's cut-out technique) -->
  <circle cx="33" cy="35" r="3" fill="#25D366"/>
  <path d="M 28 30 A 7 7 0 0 1 38 30"
        stroke="#25D366" stroke-width="3.5" stroke-linecap="round" fill="none"/>
  <path d="M 24.5 26.5 A 12 12 0 0 1 41.5 26.5"
        stroke="#25D366" stroke-width="3" stroke-linecap="round" fill="none"/>
  <path d="M 21 23 A 17 17 0 0 1 45 23"
        stroke="#25D366" stroke-width="2.5" stroke-linecap="round" fill="none"/>
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
