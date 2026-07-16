/**
 * AnimatedBrandHero
 * -----------------
 * App logo + name displayed in the Campaign home-page header.
 *
 * The logo breathes with a layered glow ring.
 * The app-name words enter one-by-one (blur → sharp, slide up),
 * hold for a moment, then exit together (sharp → blur, slide up),
 * pause, and loop — creating an elegant, magazine-quality effect.
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BroadcastLogo } from "@/components/brand-logo";
import { APP_NAME } from "@/lib/app-config";
import { useTheme } from "@/hooks/use-theme";

// ─── Timing constants (ms) ───────────────────────────────────────────────────
const WORD_DELAY_MS  = 480;   // gap between each word appearing
const HOLD_MS        = 2600;  // how long all words stay fully visible
const EXIT_MS        = 560;   // fade-out transition duration (matches motion)
const PAUSE_MS       = 720;   // silent gap before the next cycle

const EASE = [0.22, 0.68, 0.18, 1.02] as const;  // slight overshoot on entry

// ─── Component ───────────────────────────────────────────────────────────────
export function AnimatedBrandHero({ subtitle }: { subtitle?: string }) {
  const { isDark } = useTheme();
  const words  = APP_NAME.split(" ");           // ["WhatsApp", "Broadcast"]

  // phase drives the state machine: "in" → "hold" → "out" → "pause" → "in"…
  const [visible, setVisible] = useState(0);
  const [phase, setPhase] = useState<"in" | "hold" | "out" | "pause">("pause");

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (phase === "pause") {
      timer = setTimeout(() => { setVisible(0); setPhase("in"); }, PAUSE_MS);

    } else if (phase === "in") {
      if (visible < words.length) {
        // Reveal next word
        timer = setTimeout(() => setVisible((v) => v + 1), WORD_DELAY_MS);
      } else {
        // All words in → hold
        setPhase("hold");
      }

    } else if (phase === "hold") {
      timer = setTimeout(() => setPhase("out"), HOLD_MS);

    } else if (phase === "out") {
      // Let the exit animation play, then pause
      timer = setTimeout(() => setPhase("pause"), EXIT_MS + 80);
    }

    return () => clearTimeout(timer);
  }, [phase, visible, words.length]);

  const exiting = phase === "out" || phase === "pause";

  // Gradient colours adapt to dark / light mode
  const textGradient = isDark
    ? "linear-gradient(135deg, #4ade80 0%, #86efac 60%, #a7f3d0 100%)"
    : "linear-gradient(135deg, #065f46 0%, #059669 55%, #10b981 100%)";

  return (
    <div className="flex items-center gap-4 select-none">

      {/* ── Logo + breathing glow ─────────────────────────────── */}
      <div className="relative shrink-0 flex items-center justify-center">

        {/* Outer diffuse glow — pulses slowly */}
        <motion.div
          className="absolute rounded-[20px]"
          style={{
            width: 70, height: 70,
            background: "linear-gradient(135deg, #075e54 0%, #25d366 100%)",
            filter: "blur(18px)",
          }}
          animate={{ opacity: exiting ? 0.15 : [0.25, 0.55, 0.25], scale: [1, 1.18, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Inner tight glow */}
        <motion.div
          className="absolute rounded-[16px]"
          style={{
            width: 54, height: 54,
            background: "linear-gradient(135deg, #128c7e 0%, #25d366 100%)",
            filter: "blur(8px)",
          }}
          animate={{ opacity: exiting ? 0 : [0.4, 0.7, 0.4] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        />

        {/* The actual logo icon */}
        <motion.div
          animate={{ scale: exiting ? 0.94 : 1 }}
          transition={{ duration: 0.55, ease: EASE }}
        >
          <BroadcastLogo size={48} className="relative rounded-[14px] shadow-xl shadow-primary/30" />
        </motion.div>
      </div>

      {/* ── Animated words ────────────────────────────────────── */}
      <div>
        {/* App name — word by word */}
        <div className="flex items-baseline gap-[0.3em] overflow-hidden py-0.5">
          {words.map((word, i) => (
            <motion.span
              key={word}
              className="text-[1.65rem] leading-none font-extrabold tracking-tight bg-clip-text text-transparent"
              style={{ backgroundImage: textGradient }}
              animate={
                exiting
                  ? { opacity: 0, y: -12, filter: "blur(8px)" }
                  : i < visible
                    ? { opacity: 1, y: 0,   filter: "blur(0px)" }
                    : { opacity: 0, y: 22,  filter: "blur(8px)" }
              }
              transition={{
                duration: exiting ? EXIT_MS / 1000 : 0.5,
                // on exit, second word trails the first slightly
                delay:    exiting ? i * 0.07 : 0,
                ease: EASE,
              }}
            >
              {word}
            </motion.span>
          ))}
        </div>

        {/* Subtitle — fades in once, stays visible */}
        {subtitle && (
          <motion.p
            className="text-sm text-muted-foreground mt-0.5 leading-snug"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: words.length * (WORD_DELAY_MS / 1000) + 0.1, ease: EASE }}
          >
            {subtitle}
          </motion.p>
        )}
      </div>
    </div>
  );
}
