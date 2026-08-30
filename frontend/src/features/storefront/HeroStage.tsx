"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Container } from "@/features/storefront/primitives";
import { HERO } from "@/features/storefront/content";
import { HeroSofa } from "@/features/storefront/hero/HeroSofa";
import { RoomDoors } from "@/features/storefront/hero/RoomDoors";
import { useSiteMotion } from "@/lib/useSiteMotion";

/**
 * The hero, as a room the visitor opens.
 *
 * Same inset card as every other section on the page — the reveal happens
 * inside the frame, so it reads as a window onto a room rather than the site
 * taking the screen hostage. The section is deliberately taller than the
 * screen and its contents are pinned: that extra height is the scroll budget
 * the doors swing through, and once they are gone it is the room the visitor
 * can stand in and turn the piece over before the page moves on.
 *
 * Nothing here animates on a clock. Scroll position drives all of it, which
 * means stopping stops the motion — the opposite of the drifting tiles this
 * replaced.
 */

/** Copy arrives just as the leaves clear the frame. See RoomDoors for the rest. */
const COPY_IN = [0.46, 0.68] as const;

export function HeroStage() {
  const { animate } = useSiteMotion();
  const stage = useRef<HTMLDivElement>(null);

  // 0 when the section's top reaches the top of the screen, 1 when its bottom
  // does — i.e. across exactly the distance the sticky card stays pinned.
  const { scrollYProgress } = useScroll({
    target: stage,
    offset: ["start start", "end end"],
  });

  /**
   * The wheel arrives in coarse, uneven jumps and the doors were tracking it
   * one-to-one, which is what made the swing feel notchy. Everything below
   * reads this spring instead of the raw value, so a flick of the wheel
   * becomes a weighted push on something heavy.
   */
  const progress = useSpring(scrollYProgress, {
    stiffness: 150,
    damping: 30,
    mass: 0.55,
    restDelta: 0.0005,
  });

  const roomScale = useTransform(progress, [0, 0.68], [1.22, 1]);
  const copyOpacity = useTransform(progress, [...COPY_IN], [0, 1]);
  const copyY = useTransform(progress, [...COPY_IN], [34, 0]);

  if (!animate) {
    return (
      <section className="relative bg-sand-100 px-4 pb-4 pt-2 sm:px-6 lg:px-6 lg:pb-6">
        <div className="overflow-hidden rounded-[28px] ring-1 ring-ink-900/10">
          <Room />
        </div>
      </section>
    );
  }

  return (
    <section
      ref={stage}
      className="relative h-[280vh] bg-sand-100 px-4 pb-4 pt-2 sm:px-6 lg:h-[320vh] lg:px-6 lg:pb-6"
    >
      {/* Sticks just below the header so the frame is visible on all four
          sides for the whole reveal. */}
      <div className="sticky top-[84px] h-[calc(100svh-100px)] overflow-hidden rounded-[28px] ring-1 ring-ink-900/10 shadow-[0_40px_90px_-60px_rgba(31,27,23,0.7)]">
        <motion.div style={{ scale: roomScale }} className="h-full will-change-transform">
          <Room copyOpacity={copyOpacity} copyY={copyY} />
        </motion.div>

        <RoomDoors progress={progress} />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ room -- */

function Room({
  copyOpacity,
  copyY,
}: {
  copyOpacity?: MotionValue<number>;
  copyY?: MotionValue<number>;
}) {
  return (
    <div className="relative h-full">
      {/* Daylight from the left, a warm bounce at the floor — the same light
          the 3D scene is lit with, painted in CSS so the canvas can stay
          transparent. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: [
            "radial-gradient(85% 65% at 6% 10%, rgba(255,253,248,0.95), rgba(255,253,248,0) 62%)",
            "radial-gradient(70% 55% at 82% 82%, rgba(217,98,43,0.12), rgba(217,98,43,0) 65%)",
            "linear-gradient(180deg, #FDFAF5 0%, #F7F1E7 55%, #EDE2D0 100%)",
          ].join(", "),
        }}
      />
      {/* Where the wall meets the floor. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[32%] bg-gradient-to-b from-sand-200/0 via-sand-200/45 to-sand-300/55"
      />

      <Container className="relative flex h-full flex-col justify-center py-6 lg:py-8">
        <motion.div
          style={{ opacity: copyOpacity, y: copyY }}
          className="grid min-h-0 flex-1 items-center gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-10"
        >
          {/* ------------------------------------------------------ the pitch */}
          <div className="max-w-xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-clay-500">
              Made to order · 7 series · 110 pieces
            </p>

            <h1 className="font-display mt-5 text-5xl leading-[1.0] tracking-[-0.035em] text-ink-900 sm:text-6xl lg:text-[4.2rem]">
              {HERO.headline.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h1>

            <p className="mt-5 max-w-md text-sm leading-7 text-ink-500">{HERO.blurb}</p>

            <div className="mt-7 flex flex-wrap items-center gap-6">
              <Link
                href={HERO.cta.href}
                className="inline-flex items-center gap-3 rounded-full bg-clay-500 px-7 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-clay-600"
              >
                {HERO.cta.label}
                <ArrowRight size={15} aria-hidden />
              </Link>

              {/* In-page anchor — a plain <a> so native scrolling handles it. */}
              <a
                href={HERO.secondary.href}
                className="border-b border-ink-900/25 pb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-700 transition-colors hover:border-clay-500 hover:text-clay-600"
              >
                {HERO.secondary.label}
              </a>
            </div>

            <p className="mt-7 hidden text-[10px] uppercase tracking-[0.16em] text-ink-400 sm:block">
              Made to order in Canada · Free shipping over $200 · 30-day returns
            </p>
          </div>

          {/* ----------------------------------------------------- the piece */}
          <div className="h-[38vh] min-h-[240px] lg:h-full lg:min-h-0">
            <HeroSofa />
          </div>
        </motion.div>
      </Container>
    </div>
  );
}
