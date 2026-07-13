/**
 * Broadcast signal icon:
 * WhatsApp-green rounded square + white dot + three expanding arcs.
 * Clean, minimal, readable at any size.
 */

export function BroadcastLogo({
  className,
  size = 40,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2EE076" />
          <stop offset="100%" stopColor="#075E54" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="64" height="64" rx="14" fill="url(#bg)" />

      {/* Dot — broadcast origin */}
      <circle cx="16" cy="32" r="5" fill="white" />

      {/* Arc 1 — inner */}
      <path
        d="M 23.1 24.9 A 10 10 0 0 1 23.1 39.1"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />

      {/* Arc 2 — middle */}
      <path
        d="M 27.5 18.4 A 17 17 0 0 1 27.5 45.6"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />

      {/* Arc 3 — outer */}
      <path
        d="M 31.1 12.1 A 24 24 0 0 1 31.1 51.9"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        opacity="0.4"
      />
    </svg>
  );
}
