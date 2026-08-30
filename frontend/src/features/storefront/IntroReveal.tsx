"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { OptimizedImage } from "@/components/OptimizedImage";
import { HERO_IMAGE } from "@/features/storefront/content";
import { readSession } from "@/lib/browserStorage";

/**
 * The opening reveal: a small arch-shaped window onto the hero interior that
 * grows until the room fills the screen, then fades away to expose the page.
 *
 * Plays at most once per browser session, and never for visitors who ask for
 * reduced motion.
 */

const SEEN_KEY = "sofa-intro-seen";

/** Arch at rest, before it grows to fill the viewport. */
const ARCH_WIDTH = 180;
const ARCH_HEIGHT = 240;
const ARCH_RADIUS = 220;

const GROW_DELAY = 0.25;
const GROW_DURATION = 1.6;
const FADE_DURATION = 0.5;

function markSeen() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // storage disabled or full — the intro simply replays next load
  }
}

export function IntroReveal() {
  const [viewport, setViewport] = useState<{ width: number; height: number } | null>(null);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || readSession(SEEN_KEY)) {
      setFinished(true);
      return;
    }
    markSeen();
    setViewport({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  // Nothing renders on the server or on the first client pass, so the two agree.
  if (finished || !viewport) return null;

  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-sand-100"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{
        duration: FADE_DURATION,
        delay: GROW_DELAY + GROW_DURATION,
        ease: "easeOut",
      }}
      onAnimationComplete={() => setFinished(true)}
    >
      <motion.div
        className="relative overflow-hidden"
        initial={{
          width: ARCH_WIDTH,
          height: ARCH_HEIGHT,
          borderTopLeftRadius: ARCH_RADIUS,
          borderTopRightRadius: ARCH_RADIUS,
        }}
        animate={{
          width: viewport.width,
          height: viewport.height,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
        }}
        transition={{ duration: GROW_DURATION, delay: GROW_DELAY, ease: "easeInOut" }}
      >
        {/*
          The photo layer is locked to viewport size and centred inside the arch,
          which is itself centred on screen — so the image never shifts or
          stretches while the window around it opens up.
        */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: viewport.width, height: viewport.height }}
        >
          <OptimizedImage
            src={HERO_IMAGE}
            alt=""
            sizes="100vw"
            priority
            className="h-full w-full object-cover"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
