"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSiteMotion } from "@/lib/useSiteMotion";

/** One easing curve for the whole storefront: slow out, no overshoot. */
export const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Shared building blocks for the storefront sections.
 *
 * Every section on the home page repeats the same two shapes — a heading with
 * a short right-aligned blurb, and small circular carousel controls — so they
 * live here instead of being re-styled per section.
 */

/** Section heading: serif title left, supporting copy right. */
export function SectionHeading({
  title,
  blurb,
  className,
  id,
}: {
  title: React.ReactNode;
  blurb?: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const { animate } = useSiteMotion();

  // Every section heading reveals the same way, so the page has one rhythm
  // instead of each section inventing its own.
  const reveal = animate
    ? {
        initial: { opacity: 0, y: 22 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.5 },
      }
    : {};

  return (
    <div
      className={cn(
        "flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-12",
        className
      )}
    >
      <motion.h2
        {...reveal}
        transition={{ duration: 0.7, ease: EASE }}
        id={id}
        className="font-display max-w-xl text-4xl leading-[1.02] tracking-[-0.03em] text-ink-900 sm:text-5xl lg:text-[3.4rem]"
      >
        {title}
      </motion.h2>
      {blurb ? (
        <motion.p
          {...reveal}
          transition={{ duration: 0.7, ease: EASE, delay: 0.12 }}
          className="max-w-xs text-sm leading-6 text-ink-500 sm:text-right"
        >
          {blurb}
        </motion.p>
      ) : null}
    </div>
  );
}

/** Circular prev/next control used by every carousel. */
export function CarouselButton({
  direction,
  onClick,
  disabled,
  label,
}: {
  direction: "prev" | "next";
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "grid h-10 w-10 place-items-center rounded-full border border-sand-300 text-ink-700",
        "transition-colors hover:border-clay-500 hover:bg-clay-500 hover:text-white",
        "disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-sand-300",
        "disabled:hover:bg-transparent disabled:hover:text-ink-700"
      )}
    >
      <Icon size={17} strokeWidth={1.6} />
    </button>
  );
}

export function CarouselControls({
  onPrev,
  onNext,
  canPrev = true,
  canNext = true,
  className,
}: {
  onPrev: () => void;
  onNext: () => void;
  canPrev?: boolean;
  canNext?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <CarouselButton direction="prev" onClick={onPrev} disabled={!canPrev} label="Previous" />
      <CarouselButton direction="next" onClick={onNext} disabled={!canNext} label="Next" />
    </div>
  );
}

/** Small uppercase label that sits above a heading. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "text-[10px] font-semibold uppercase tracking-[0.26em] text-clay-500",
        className
      )}
    >
      {children}
    </p>
  );
}

/** Standard page gutter + max width, shared by every section. */
export function Container({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1360px] px-6 sm:px-10 lg:px-14", className)}>
      {children}
    </div>
  );
}

/**
 * One vertical rhythm for the whole page.
 *
 * Sections were setting their own padding, which is why the gaps between them
 * drifted. Everything on the home page goes through this so the spacing is
 * decided in one place.
 */
export function Section({
  children,
  className,
  id,
  labelledBy,
  tone = "cream",
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  labelledBy?: string;
  /** `card` insets the content as a dark rounded panel on the cream page. */
  tone?: "cream" | "card";
}) {
  if (tone === "card") {
    return (
      <section id={id} aria-labelledby={labelledBy} className={cn("bg-sand-100 px-4 py-4 sm:px-6 lg:px-6 lg:py-6", className)}>
        <div className="overflow-hidden rounded-[28px] bg-ink-900 py-20 text-sand-100 lg:py-28">
          {children}
        </div>
      </section>
    );
  }

  return (
    <section id={id} aria-labelledby={labelledBy} className={cn("bg-sand-100 py-14 lg:py-20", className)}>
      {children}
    </section>
  );
}
