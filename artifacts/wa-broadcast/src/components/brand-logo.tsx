/**
 * WhatsApp Broadcast — App Icon (SVG)
 *
 * Bold megaphone pointing right with three chat-bubble messages
 * flying out of it — immediately communicates "broadcast messaging".
 * WhatsApp-green diagonal gradient background, pure-white elements.
 */
import { useId } from "react";

export function BroadcastLogo({
  className,
  size = 40,
}: {
  className?: string;
  size?: number;
}) {
  const uid  = useId().replace(/:/g, "");
  const bgId = `wab-bg-${uid}`;
  const shId = `wab-sh-${uid}`;

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
        {/* WA green: dark teal → vivid emerald (diagonal) */}
        <linearGradient id={bgId} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#075E54" />
          <stop offset="100%" stopColor="#25D366" />
        </linearGradient>
        {/* Glass shine top-left */}
        <radialGradient id={shId} cx="20%" cy="14%" r="55%" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.20" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0"    />
        </radialGradient>
      </defs>

      {/* Background */}
      <rect width="64" height="64" rx="14" fill={`url(#${bgId})`} />
      <rect width="64" height="64" rx="14" fill={`url(#${shId})`} />

      {/* ── Megaphone + bubbles — scaled to leave breathing room ── */}
      <g transform="translate(32,32) scale(0.82) translate(-32,-32)">

        {/* ── Megaphone ── */}
        {/* Cone / horn: left-narrow → right-wide */}
        <path
          d="M14 23 L14 41 L38 54 L38 10 Z"
          fill="white"
        />
        {/* Round speaker ring at the right (wide) end */}
        <ellipse cx="38" cy="32" rx="5" ry="22" fill="white" />
        {/* Inner dark ring for depth */}
        <ellipse cx="38" cy="32" rx="3" ry="16" fill={`url(#${bgId})`} opacity="0.35" />

        {/* Grip handle */}
        <rect x="7" y="40" width="8" height="13" rx="4" fill="white" />
        {/* Button on handle */}
        <circle cx="11" cy="47" r="1.8" fill={`url(#${bgId})`} opacity="0.4" />

        {/* ── Three chat bubbles flying out the wide end ── */}
        {/* Bubble 1 — largest, top */}
        <rect x="45" y="7"  width="16" height="11" rx="4" fill="white" opacity="0.95" />
        <polygon points="46,18 46,22 51,18" fill="white" opacity="0.95" />
        <rect x="48" y="10" width="9" height="1.8" rx="0.9" fill={`url(#${bgId})`} opacity="0.55" />
        <rect x="48" y="13" width="7" height="1.8" rx="0.9" fill={`url(#${bgId})`} opacity="0.55" />

        {/* Bubble 2 — medium, middle */}
        <rect x="46" y="27" width="14" height="10" rx="3.5" fill="white" opacity="0.80" />
        <polygon points="47,27 47,24 51,27" fill="white" opacity="0.80" />
        <rect x="49" y="30" width="8"  height="1.6" rx="0.8" fill={`url(#${bgId})`} opacity="0.50" />
        <rect x="49" y="33" width="6"  height="1.6" rx="0.8" fill={`url(#${bgId})`} opacity="0.50" />

        {/* Bubble 3 — smallest, bottom */}
        <rect x="44" y="46" width="12" height="8"  rx="3"   fill="white" opacity="0.62" />
        <polygon points="46,54 46,57 50,54" fill="white" opacity="0.62" />
        <rect x="47" y="49" width="6"  height="1.4" rx="0.7" fill={`url(#${bgId})`} opacity="0.45" />
        <rect x="47" y="52" width="4"  height="1.4" rx="0.7" fill={`url(#${bgId})`} opacity="0.45" />

      </g>
    </svg>
  );
}
