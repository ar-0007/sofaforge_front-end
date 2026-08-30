"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Quote } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Container, SectionHeading, CarouselControls } from "@/features/storefront/primitives";
import { TESTIMONIALS } from "@/features/storefront/content";
import { cn } from "@/lib/utils";

/**
 * Testimonials: one quote paired with a stack of overlapping customer photos.
 *
 * The photos are the selector — the active person's portrait grows into the
 * centre of the composition while the other two settle into the corners, so
 * switching reads as a single rearrangement rather than a slideshow.
 */

const items = TESTIMONIALS.items;

/**
 * Positions are percentages of the (fixed aspect-ratio) stage, so the whole
 * composition scales with its column and can never push past the gutter.
 * Index = distance from the active testimonial: 0 centre, 1 next, 2 previous.
 */
const SLOTS = [
  { left: "15%", top: "7%", width: "70%", height: "80%", opacity: 1, zIndex: 20 },
  { left: "62%", top: "62%", width: "38%", height: "38%", opacity: 0.7, zIndex: 10 },
  { left: "0%", top: "0%", width: "34%", height: "34%", opacity: 0.7, zIndex: 10 },
] as const;

const slide = { type: "spring", stiffness: 190, damping: 26, mass: 0.9 } as const;

export function Testimonials() {
  const [activeId, setActiveId] = useState<string>(items[0].id);

  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.id === activeId)
  );
  const active = items[activeIndex];

  const step = (delta: number) =>
    setActiveId(items[(activeIndex + delta + items.length) % items.length].id);

  return (
    <section aria-labelledby="testimonials-heading" className="bg-sand-50 py-14 lg:py-20">
      <Container>
        <SectionHeading
          id="testimonials-heading"
          title={TESTIMONIALS.title.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
          blurb={TESTIMONIALS.blurb}
        />

        <div className="mt-14 grid items-center gap-14 lg:mt-20 lg:grid-cols-2 lg:gap-20">
          {/* Quote */}
          <div className="order-2 lg:order-1">
            <div className="flex items-center gap-3">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-clay-500/12 text-clay-500">
                <Check size={14} strokeWidth={2.4} aria-hidden="true" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.26em] text-ink-500">
                Trusted
              </span>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="mt-7"
              >
                <Quote
                  size={26}
                  strokeWidth={1.4}
                  aria-hidden="true"
                  className="text-sand-400"
                />
                <blockquote className="mt-5 max-w-[34rem] text-lg leading-8 text-ink-700 lg:text-xl">
                  {active.quote}
                </blockquote>
                <cite className="mt-8 block not-italic">
                  <span className="block text-sm font-medium text-ink-900">{active.name}</span>
                  <span className="mt-1 block text-xs text-ink-500">{active.role}</span>
                </cite>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Overlapping photo stack, doubling as the selector */}
          <div className="order-1 lg:order-2">
            <CarouselControls
              onPrev={() => step(-1)}
              onNext={() => step(1)}
              canPrev
              canNext
              className="mb-6 justify-end"
            />

            <div className="relative mx-auto aspect-square w-full max-w-[22rem] sm:max-w-md lg:max-w-none">
              {items.map((item, index) => {
                const slot = SLOTS[(index - activeIndex + items.length) % items.length];
                const isActive = item.id === active.id;

                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveId(item.id)}
                    aria-label={`Read ${item.name}'s review`}
                    aria-current={isActive ? "true" : undefined}
                    animate={slot}
                    transition={slide}
                    className={cn(
                      "absolute overflow-hidden rounded-2xl bg-sand-200",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50",
                      isActive
                        ? "cursor-default shadow-[0_28px_60px_-24px_rgba(31,27,23,0.45)]"
                        : "cursor-pointer ring-1 ring-sand-300 transition-opacity hover:opacity-100"
                    )}
                  >
                    <OptimizedImage
                      src={item.photo}
                      alt={item.name}
                      sizes="(min-width: 1024px) 30vw, 60vw"
                      className="h-full w-full object-cover"
                    />
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
