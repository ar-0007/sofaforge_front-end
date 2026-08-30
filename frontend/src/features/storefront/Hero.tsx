"use client";

import { motion, type Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Container } from "@/features/storefront/primitives";
import { HERO, HERO_IMAGE } from "@/features/storefront/content";
import { useSiteMotion } from "@/lib/useSiteMotion";

/**
 * Full-bleed cinematic hero.
 *
 * The catalogue photography is shot as complete room scenes, so the piece is
 * shown in situ at full width rather than matted into a frame — the room is the
 * argument. Copy sits left over a gradient that keeps it readable without
 * dimming the whole photograph.
 */

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export function Hero() {
  const { animate } = useSiteMotion();

  return (
    // Inset on every side so the photograph reads as a card on the cream page,
    // matching the rest of the sections.
    <section className="relative bg-sand-100 px-4 pb-4 pt-2 sm:px-6 lg:px-6 lg:pb-6">
      <div className="relative overflow-hidden rounded-[28px]">
        <OptimizedImage
          src={HERO_IMAGE}
          alt="A Stanton II XL sectional in a bright, open living room"
          sizes="100vw"
          priority
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* Readability without flattening the photograph. */}
        <div className="absolute inset-0 bg-gradient-to-r from-ink-900/75 via-ink-900/40 to-ink-900/5" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/45 via-transparent to-transparent" />

        <Container className="relative">
          <motion.div
            variants={container}
            initial={animate ? "hidden" : false}
            animate="visible"
            className="flex min-h-[70vh] max-w-2xl flex-col justify-center py-24 lg:min-h-[80vh] lg:py-28"
          >
            <motion.h1
              variants={rise}
              className="font-display text-5xl leading-[1.0] tracking-[-0.035em] text-white sm:text-6xl lg:text-7xl"
            >
              {HERO.headline.map(line => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </motion.h1>

            <motion.p variants={rise} className="mt-7 max-w-md text-sm leading-7 text-white/75">
              {HERO.blurb}
            </motion.p>

            <motion.div variants={rise} className="mt-10 flex flex-wrap items-center gap-6">
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
                className="border-b border-white/40 pb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white transition-colors hover:border-white"
              >
                {HERO.secondary.label}
              </a>
            </motion.div>

            <motion.p
              variants={rise}
              className="mt-10 text-[10px] uppercase tracking-[0.16em] text-white/55"
            >
              Made to order in Canada · Free shipping over $200 · 30-day returns
            </motion.p>
          </motion.div>
        </Container>
      </div>
    </section>
  );
}
