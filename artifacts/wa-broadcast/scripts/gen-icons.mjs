/**
 * Generates all PWA / favicon PNG files from the SVG icon.
 * Run: node artifacts/wa-broadcast/scripts/gen-icons.mjs
 *
 * Keep the SVG geometry here in sync with brand-logo.tsx.
 * (No React / useId needed — static IDs are fine for standalone files.)
 */
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir   = dirname(fileURLToPath(import.meta.url));
const iconsDir = resolve(__dir, "../public/icons");

function buildSvg(size) {
  return `
<svg width="${size}" height="${size}" viewBox="0 0 64 64"
     fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="64" y2="64"
                    gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stop-color="#2EE076"/>
      <stop offset="100%" stop-color="#20C65A"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="64" height="64" rx="14" fill="url(#bg)"/>

  <!-- WhatsApp-style speech bubble with bottom-left tail -->
  <path d="M 14 6 H 50 Q 57 6 57 13 V 37 Q 57 44 50 44
           H 20 L 5 58 L 15 44 H 14 Q 7 44 7 37 V 13 Q 7 6 14 6 Z"
        fill="white"/>

  <!-- Broadcast signal: dot + 3 arcs (WA dark-green) -->
  <circle cx="18" cy="25" r="3" fill="#075E54"/>

  <path d="M 23.1 18.9 A 8 8 0 0 1 23.1 31.1"
        stroke="#075E54" stroke-width="3.5" stroke-linecap="round" fill="none"/>

  <path d="M 25.7 13.9 A 13.5 13.5 0 0 1 25.7 36.1"
        stroke="#075E54" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.65"/>

  <path d="M 29.7 10.0 A 19 19 0 0 1 29.7 40.0"
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
