/**
 * Generates all PWA / favicon PNGs from the master SVG.
 * Run: node artifacts/wa-broadcast/scripts/gen-icons.mjs
 *
 * Keep geometry in sync with src/components/brand-logo.tsx.
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
    <!-- 3-stop diagonal gradient -->
    <linearGradient id="g" x1="0" y1="0" x2="64" y2="64"
                    gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stop-color="#0D3D36"/>
      <stop offset="50%"  stop-color="#128C7E"/>
      <stop offset="100%" stop-color="#25D366"/>
    </linearGradient>
    <!-- Top-right radial highlight -->
    <radialGradient id="s" cx="72%" cy="18%" r="52%">
      <stop offset="0%"   stop-color="#fff" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="64" height="64" rx="14" fill="url(#g)"/>
  <rect width="64" height="64" rx="14" fill="url(#s)"/>

  <!-- Speech bubble: circle + WA-style bottom-left tail -->
  <circle cx="32" cy="25" r="21" fill="white"/>
  <polygon points="13,34 6,57 21,43" fill="white"/>

  <!-- Broadcast signal: origin dot + 3 concentric upward arcs -->
  <circle cx="32" cy="36" r="3" fill="#075E54"/>

  <path d="M 27 31 A 7 7 0 0 1 37 31"
        stroke="#075E54" stroke-width="3.5" stroke-linecap="round" fill="none"/>

  <path d="M 23.5 27.5 A 12 12 0 0 1 40.5 27.5"
        stroke="#075E54" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.65"/>

  <path d="M 20 24 A 17 17 0 0 1 44 24"
        stroke="#075E54" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.35"/>
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
