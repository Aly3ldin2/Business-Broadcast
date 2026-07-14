/**
 * WhatsApp Broadcast — App Icon
 *
 * Concept: megaphone (broadcast) on a WhatsApp-green rounded square.
 * The megaphone is universally understood as "broadcast / announce to many"
 * and reads clearly at every size from 16 px up.
 *
 * Geometry (viewBox 64 × 64):
 *   Body  : rect  x=9  y=26  w=13  h=12   (the box part of the megaphone)
 *   Horn  : polygon 22,26 → 22,38 → 36,48 → 36,16   (opens right)
 *   Handle: rounded rect  x=9  y=38  w=8   h=14  rx=4  (grip below body)
 *   Arcs  : three concentric right-facing arcs from the horn mouth
 *
 * Color scheme:
 *   Background  : 3-stop linear gradient  #0D3D36 → #128C7E → #25D366
 *   Megaphone   : white  (pops on any part of the gradient)
 *   Arc opacity : 1 → 0.65 → 0.38  (natural signal fade)
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
        {/* 3-stop diagonal gradient — WA's full colour range */}
        <linearGradient id={gId} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#0D3D36" />
          <stop offset="50%"  stopColor="#128C7E" />
          <stop offset="100%" stopColor="#25D366" />
        </linearGradient>

        {/* Top-right radial highlight — premium glassy depth */}
        <radialGradient id={shId} cx="75%" cy="15%" r="50%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0"    />
        </radialGradient>
      </defs>

      {/* ── Background ── */}
      <rect width="64" height="64" rx="14" fill={`url(#${gId})`}  />
      <rect width="64" height="64" rx="14" fill={`url(#${shId})`} />

      {/* ══════════════════════════════════════════════
          MEGAPHONE
      ══════════════════════════════════════════════ */}

      {/* Body — the rectangular back of the megaphone */}
      <rect x="8" y="26" width="14" height="12" rx="2" fill="white" />

      {/* Horn — opens to the right */}
      <polygon
        points="22,26 22,38 38,50 38,14"
        fill="white"
      />

      {/* Handle — grip below body */}
      <rect x="9" y="38" width="9" height="13" rx="4.5" fill="white" />

      {/* ══════════════════════════════════════════════
          SOUND WAVES — three concentric arcs to the right
          Centre of the horn mouth: (38, 32)
      ══════════════════════════════════════════════ */}

      {/* Arc 1 — close, bold */}
      <path
        d="M 42 24 A 8 8 0 0 1 42 40"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
        opacity="1"
      />

      {/* Arc 2 — medium */}
      <path
        d="M 46 20 A 12 12 0 0 1 46 44"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.65"
      />

      {/* Arc 3 — far, subtle */}
      <path
        d="M 50 16 A 16 16 0 0 1 50 48"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.35"
      />
    </svg>
  );
}
