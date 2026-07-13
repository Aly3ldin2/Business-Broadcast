/**
 * WhatsApp-style broadcast logo.
 *
 * Concept: the classic WA speech-bubble shape (rounded rect + bottom-left
 * tail) with a broadcast signal (dot + 3 expanding arcs) inside — combining
 * the "messaging" and "broadcast" metaphors in one mark.
 *
 * Fix: gradient IDs are scoped per-instance via useId() to avoid collisions
 * when multiple logos appear on the same page.
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
          id={`bg-${uid}`}
          x1="0" y1="0" x2="64" y2="64"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%"   stopColor="#2EE076" />
          <stop offset="100%" stopColor="#20C65A" />
        </linearGradient>
      </defs>

      {/* WhatsApp-green rounded square */}
      <rect width="64" height="64" rx="14" fill={`url(#bg-${uid})`} />

      {/*
        Speech bubble — WhatsApp style:
        rounded rect (7,6)→(57,44) with a triangular tail at bottom-left
        pointing to (5,58). All corners r=7.
      */}
      <path
        d="M 14 6 H 50 Q 57 6 57 13 V 37 Q 57 44 50 44 H 20 L 5 58 L 15 44 H 14 Q 7 44 7 37 V 13 Q 7 6 14 6 Z"
        fill="white"
      />

      {/*
        Broadcast signal — virtual source at (18, 25):
        • filled dot (the origin)
        • 3 concentric arcs opening rightward, all centred ≈ (18, 25)
        Colour: WA dark-green #075E54 for contrast on white.
      */}
      <circle cx="18" cy="25" r="3" fill="#075E54" />

      {/* Arc 1 — r=8, spread ±50° */}
      <path
        d="M 23.1 18.9 A 8 8 0 0 1 23.1 31.1"
        stroke="#075E54"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Arc 2 — r=13.5, spread ±55° */}
      <path
        d="M 25.7 13.9 A 13.5 13.5 0 0 1 25.7 36.1"
        stroke="#075E54"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.65"
      />

      {/* Arc 3 — r=19, spread ±52° */}
      <path
        d="M 29.7 10.0 A 19 19 0 0 1 29.7 40.0"
        stroke="#075E54"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.35"
      />
    </svg>
  );
}
