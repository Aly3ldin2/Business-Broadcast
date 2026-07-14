/**
 * WhatsApp Broadcast — App Icon
 *
 * Megaphone (broadcast) on a WhatsApp-green rounded square.
 * Colors tuned to match WhatsApp's own icon palette (#25D366 bright green).
 * Megaphone scaled to ~78 % of the tile so there is clear breathing room.
 *
 * The entire megaphone group is transformed:
 *   translate(32,32) scale(0.78) translate(-32,-32)
 * which scales around the visual centre of the viewBox.
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
        {/*
         * WhatsApp-accurate gradient:
         *   #128C7E  (WA teal / dark green used in headers)  → top-left
         *   #25D366  (WA brand green / icon background)      → bottom-right
         * Keeps exactly two stops so the hue stays firmly in WA territory.
         */}
        <linearGradient id={gId} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#128C7E" />
          <stop offset="100%" stopColor="#25D366" />
        </linearGradient>

        {/* Top-right radial highlight — subtle glassy depth */}
        <radialGradient id={shId} cx="75%" cy="15%" r="50%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0"    />
        </radialGradient>
      </defs>

      {/* ── Background ── */}
      <rect width="64" height="64" rx="14" fill={`url(#${gId})`}  />
      <rect width="64" height="64" rx="14" fill={`url(#${shId})`} />

      {/*
       * ── Megaphone ──
       * Scaled to 78 % around the centre point (32, 32) so there is
       * generous white-space around it — exactly like a well-designed app icon.
       */}
      <g transform="translate(32,32) scale(0.78) translate(-32,-32)">

        {/* Body — rectangular back of the megaphone */}
        <rect x="8" y="26" width="14" height="12" rx="2.5" fill="white" />

        {/* Horn — opens to the right */}
        <polygon points="22,26 22,38 38,50 38,14" fill="white" />

        {/* Handle — grip below body */}
        <rect x="9" y="38" width="9" height="13" rx="4.5" fill="white" />

        {/* Sound-wave arcs — three concentric, fading outward */}
        <path
          d="M 42 24 A 8 8 0 0 1 42 40"
          stroke="white" strokeWidth="3.5" strokeLinecap="round" fill="none"
          opacity="1"
        />
        <path
          d="M 46 20 A 12 12 0 0 1 46 44"
          stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"
          opacity="0.65"
        />
        <path
          d="M 50 16 A 16 16 0 0 1 50 48"
          stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"
          opacity="0.38"
        />
      </g>
    </svg>
  );
}
