// WhatsApp-inspired broadcast logo:
// Green rounded square + white speech-bubble + send arrow inside.
// Expresses "mass messaging" while staying on WA's visual language.

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
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background – WhatsApp green rounded square */}
      <rect width="48" height="48" rx="13" fill="#25D366" />

      {/* Subtle top-left gloss */}
      <ellipse cx="16" cy="12" rx="10" ry="6" fill="white" opacity="0.12" />

      {/* White speech bubble with bottom-left tail (WA style) */}
      <path
        d="M9 8 C9 5.8 10.8 4 13 4 H35 C37.2 4 39 5.8 39 8 V26 C39 28.2 37.2 30 35 30 H22 L11 40 V30 H13 C10.8 30 9 28.2 9 26 Z"
        fill="white"
      />

      {/* Broadcast icon inside bubble ─ paper-plane + two arcs */}
      {/* Paper-plane body (dark green) */}
      <path
        d="M14 25 L30 11 L26 29 Z"
        fill="#075E54"
        opacity="0.9"
      />
      {/* Fold / wing detail */}
      <path
        d="M14 25 L20 21 L26 29 Z"
        fill="#075E54"
        opacity="0.5"
      />

      {/* Signal arcs – broadcast waves emanating right */}
      <path
        d="M27 15 Q32 18 27 23"
        stroke="#128C7E"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.8"
      />
      <path
        d="M30 12 Q37 18 30 26"
        stroke="#128C7E"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
}
