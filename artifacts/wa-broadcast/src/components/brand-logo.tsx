/**
 * WhatsApp Broadcast — App Icon
 *
 * Visual language is a faithful translation of WhatsApp's own icon:
 *   • WhatsApp-green rounded-square background  (#25D366)
 *   • Large white speech-bubble (circle + bottom-left tail)
 *   • Content carved INTO the white bubble using the same green,
 *     exactly like WA's phone handset is "cut" from its bubble.
 *
 * Content: a broadcast / WiFi-style signal (dot + 3 arcs opening
 * upward) — the universally-understood "broadcast to many" symbol.
 *
 * Geometry notes:
 *   Bubble circle  : cx=33  cy=25  r=21
 *   Tail vertices  : (14,34) → (7,57) → (22,43)  — all on / near circle edge
 *   Signal center  : (33,35)  — lower-center of bubble
 *   Arc sweeps     : 90° each, clockwise, short-arc (large-arc=0 sweep=1)
 *
 * Fix: gradient IDs are instance-scoped via useId() to avoid SVG
 * ID collisions when multiple logos appear on the same page.
 */
import { useId } from "react";

export function BroadcastLogo({
  className,
  size = 40,
}: {
  className?: string;
  size?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const gradId = `wa-grad-${uid}`;

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
        <linearGradient
          id={gradId}
          x1="0" y1="0" x2="64" y2="64"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%"   stopColor="#2ECC71" />
          <stop offset="100%" stopColor="#25D366" />
        </linearGradient>
      </defs>

      {/* ── WhatsApp-green rounded square ── */}
      <rect width="64" height="64" rx="14" fill={`url(#${gradId})`} />

      {/* ── Speech bubble — WhatsApp-style ──
           Large white circle + triangular tail at bottom-left.
           Tail vertices are on / near the circle edge so the join is seamless. */}
      <circle cx="33" cy="25" r="21" fill="white" />
      <polygon points="14,34 7,57 22,43" fill="white" />

      {/* ── Broadcast signal carved into the bubble ──
           Color matches the green background → creates the same
           "cut-out" effect WhatsApp uses for its phone handset.

           All three arcs are concentric around (33,35) — the dot.
           Each spans 90° (225° → 315° clockwise) = upward-opening arc.

           Arc 1  r=7    endpoints (28,30)  →  (38,30)
           Arc 2  r=12   endpoints (24.5,26.5) → (41.5,26.5)
           Arc 3  r=17   endpoints (21,23)  →  (45,23)          */}

      {/* Origin dot */}
      <circle cx="33" cy="35" r="3" fill="#25D366" />

      {/* Arc 1 — innermost */}
      <path
        d="M 28 30 A 7 7 0 0 1 38 30"
        stroke="#25D366"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Arc 2 — middle */}
      <path
        d="M 24.5 26.5 A 12 12 0 0 1 41.5 26.5"
        stroke="#25D366"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* Arc 3 — outermost */}
      <path
        d="M 21 23 A 17 17 0 0 1 45 23"
        stroke="#25D366"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
