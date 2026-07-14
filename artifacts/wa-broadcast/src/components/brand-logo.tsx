/**
 * WhatsApp Broadcast — App Icon
 *
 * Visual language mirrors WhatsApp's own icon:
 *   • Rounded-square background with a rich 3-stop diagonal gradient
 *     (#0D3D36 deep teal → #128C7E WA teal → #25D366 WA bright green)
 *   • Subtle top-right radial highlight for the "glassy" depth found on
 *     premium app icons
 *   • Large white circular speech bubble + bottom-left triangular tail
 *     (identical construction to WhatsApp's own logo shape)
 *   • Broadcast signal inside: origin dot + 3 concentric upward arcs,
 *     rendered in WA's dark green — the same "carved from white" technique
 *     WhatsApp uses for its phone handset
 *
 * Geometry reference:
 *   Bubble circle  : cx=32  cy=25  r=21
 *   Tail vertices  : (13,34) (6,57) (21,43) — all on the circle edge
 *   Signal origin  : (32,36)
 *   Arc 1          : r=7    → M 27 31 A 7 7 0 0 1 37 31
 *   Arc 2          : r=12   → M 23.5 27.5 A 12 12 0 0 1 40.5 27.5
 *   Arc 3          : r=17   → M 20 24 A 17 17 0 0 1 44 24
 *
 * ID fix: gradient IDs are scoped per-instance via React's useId() to
 * prevent SVG ID collisions when multiple logos appear on the same page.
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
  const gId  = `wa-bg-${uid}`;
  const shId = `wa-sh-${uid}`;

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
        {/* 3-stop diagonal gradient — WhatsApp's full colour range */}
        <linearGradient id={gId} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#0D3D36" />
          <stop offset="50%"  stopColor="#128C7E" />
          <stop offset="100%" stopColor="#25D366" />
        </linearGradient>

        {/* Top-right radial highlight — premium "glassy" depth */}
        <radialGradient id={shId} cx="72%" cy="18%" r="52%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0"    />
        </radialGradient>
      </defs>

      {/* ── Background ── */}
      <rect width="64" height="64" rx="14" fill={`url(#${gId})`}  />
      <rect width="64" height="64" rx="14" fill={`url(#${shId})`} />

      {/* ── Speech bubble ──
           Large white circle (r=21, centred at 32,25) plus a triangular tail
           at the bottom-left — exact same construction as the WhatsApp logo. */}
      <circle cx="32" cy="25" r="21" fill="white" />
      <polygon points="13,34 6,57 21,43" fill="white" />

      {/* ── Broadcast signal ──
           All elements share the virtual centre (32,36) = the origin dot.
           The three arcs are ±45° upward sections of concentric circles,
           identical to a WiFi / broadcast symbol oriented upward.
           Colour: WA dark green #075E54 on the white bubble surface.
           Opacity fades outward: 1 → 0.65 → 0.35 for a natural signal feel. */}

      {/* Origin dot */}
      <circle cx="32" cy="36" r="3" fill="#075E54" />

      {/* Arc 1 — r = 7 */}
      <path
        d="M 27 31 A 7 7 0 0 1 37 31"
        stroke="#075E54"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Arc 2 — r = 12 */}
      <path
        d="M 23.5 27.5 A 12 12 0 0 1 40.5 27.5"
        stroke="#075E54"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.65"
      />

      {/* Arc 3 — r = 17 */}
      <path
        d="M 20 24 A 17 17 0 0 1 44 24"
        stroke="#075E54"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.35"
      />
    </svg>
  );
}
