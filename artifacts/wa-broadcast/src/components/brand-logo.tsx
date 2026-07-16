/**
 * WhatsApp Broadcast — App Icon (SVG)
 *
 * Broadcast tower + signal waves on a rich green rounded square.
 * Designed to feel modern, expressive, and match the app's purpose.
 */
import { useId } from "react";

export function BroadcastLogo({
  className,
  size = 40,
}: {
  className?: string;
  size?: number;
}) {
  const uid   = useId().replace(/:/g, "");
  const bgId  = `wab-bg-${uid}`;
  const glowId = `wab-glow-${uid}`;
  const shineId = `wab-shine-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        {/* Deep-to-vivid green — dark center radiating outward */}
        <radialGradient id={bgId} cx="38%" cy="30%" r="72%" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#1a6b3c" />
          <stop offset="55%"  stopColor="#128C7E" />
          <stop offset="100%" stopColor="#25D366" />
        </radialGradient>

        {/* Inner glow behind the tower */}
        <radialGradient id={glowId} cx="32" cy="38" r="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#00ff88" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#00ff88" stopOpacity="0"    />
        </radialGradient>

        {/* Top-left glassy shine */}
        <radialGradient id={shineId} cx="20%" cy="12%" r="48%" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0"    />
        </radialGradient>
      </defs>

      {/* ── Background ── */}
      <rect width="64" height="64" rx="14" fill={`url(#${bgId})`} />
      <rect width="64" height="64" rx="14" fill={`url(#${glowId})`} />
      <rect width="64" height="64" rx="14" fill={`url(#${shineId})`} />

      {/* ── Broadcast tower ── centered, scaled to ~75 % */}
      <g transform="translate(32,32) scale(0.77) translate(-32,-32)">

        {/* Tower legs — two diagonal supports */}
        <line x1="32" y1="18" x2="20" y2="50" stroke="white" strokeWidth="3.2" strokeLinecap="round" />
        <line x1="32" y1="18" x2="44" y2="50" stroke="white" strokeWidth="3.2" strokeLinecap="round" />

        {/* Cross braces */}
        <line x1="22" y1="38" x2="42" y2="38" stroke="white" strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
        <line x1="24.5" y1="28" x2="39.5" y2="28" stroke="white" strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />

        {/* Mast — vertical spine */}
        <line x1="32" y1="10" x2="32" y2="18" stroke="white" strokeWidth="2.8" strokeLinecap="round" />

        {/* Top orb */}
        <circle cx="32" cy="10" r="3" fill="white" />

        {/* Base platform */}
        <rect x="18" y="50" width="28" height="3.5" rx="1.8" fill="white" opacity="0.9" />

        {/* ── Signal waves (right side) ── */}
        {/* Wave 1 — closest / strongest */}
        <path
          d="M 38 23 A 8 8 0 0 1 38 37"
          stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"
          opacity="1"
        />
        {/* Wave 2 */}
        <path
          d="M 42 19 A 13 13 0 0 1 42 41"
          stroke="white" strokeWidth="2.4" strokeLinecap="round" fill="none"
          opacity="0.65"
        />
        {/* Wave 3 — faintest / broadest */}
        <path
          d="M 47 14 A 19 19 0 0 1 47 46"
          stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"
          opacity="0.35"
        />

        {/* ── Message dots (bottom-right) — three tiny chat bubbles ── */}
        <circle cx="24" cy="56" r="2.4" fill="white" opacity="0.6" />
        <circle cx="32" cy="58" r="2.8" fill="white" opacity="0.75" />
        <circle cx="40" cy="56" r="2.4" fill="white" opacity="0.6" />
      </g>
    </svg>
  );
}
