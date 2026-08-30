"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Tilt } from "@/components/motion-primitives/tilt";
import { Container, Eyebrow, SectionHeading } from "@/features/storefront/primitives";
import { SHAPES } from "@/features/storefront/content";
import { cn } from "@/lib/utils";

/**
 * Shape finder: the primary entry into a 110-piece catalogue.
 *
 * Nobody browses 110 SKUs — they arrive asking "what shape fits my room?", so
 * the whole section is six answers to that one question. The first card
 * (L-Shape, by far the most common choice) is deliberately larger and laid out
 * horizontally so the grid has an obvious place to start instead of reading as
 * six equal, equally undecidable options.
 */

type Shape = (typeof SHAPES.items)[number];

function ShapeCard({ shape, index }: { shape: Shape; index: number }) {
  const featured = index === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: 0.55,
        ease: [0.22, 1, 0.36, 1],
        delay: Math.min(index, 5) * 0.06,
      }}
      className={cn(featured && "sm:col-span-2")}
    >
      {/* Small rotation only — the cards should feel responsive, not novelty. */}
      <Tilt
        rotationFactor={6}
        springOptions={{ stiffness: 220, damping: 26, mass: 0.6 }}
        className="h-full"
      >
        <Link
          href={`/shop?shape=${shape.id}`}
          className={cn(
            "group flex h-full flex-col gap-5 rounded-2xl border border-sand-200 bg-sand-50 p-4",
            "shadow-[0_1px_2px_rgba(31,27,23,0.04)] transition-[border-color,box-shadow] duration-300",
            "hover:border-clay-500/40 hover:shadow-[0_22px_44px_-26px_rgba(31,27,23,0.45)]",
            "focus-visible:border-clay-500/40 focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-clay-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-sand-100",
            featured && "sm:flex-row sm:items-center sm:gap-8 sm:p-5"
          )}
        >
          {/* Product renders, not lifestyle shots — contained inside the well, never cropped. */}
          <div
            className={cn(
              "aspect-[4/3] w-full overflow-hidden rounded-xl bg-sand-200",
              featured && "sm:w-[54%] sm:shrink-0"
            )}
          >
            <OptimizedImage
              src={shape.image}
              alt={shape.name}
              sizes={
                featured
                  ? "(min-width: 1024px) 42vw, (min-width: 640px) 50vw, 92vw"
                  : "(min-width: 1024px) 23vw, (min-width: 640px) 45vw, 92vw"
              }
              className="h-full w-full object-contain p-4 transition-transform duration-700 ease-out group-hover:scale-[1.05] sm:p-6"
            />
          </div>

          <div
            className={cn(
              "flex flex-1 flex-col gap-2 px-1 pb-2",
              featured && "sm:pb-0 sm:pr-6"
            )}
          >
            <Eyebrow>{shape.tagline}</Eyebrow>
            <h3
              className={cn(
                "font-display text-2xl leading-[1.1] tracking-[-0.02em] text-ink-900",
                featured && "sm:text-[2.1rem]"
              )}
            >
              {shape.name}
            </h3>
            <p
              className={cn(
                "text-sm leading-6 text-ink-500",
                featured && "sm:max-w-sm sm:text-[0.95rem]"
              )}
            >
              {shape.copy}
            </p>

            <div className="mt-auto flex items-center justify-between gap-4 pt-5">
              <span className="text-xs tracking-wide text-ink-400">{shape.count} pieces</span>
              <span
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-full border border-sand-300 text-ink-700",
                  "transition-colors duration-300 group-hover:border-clay-500 group-hover:bg-clay-500",
                  "group-hover:text-sand-50"
                )}
              >
                <ArrowUpRight size={15} strokeWidth={1.7} />
              </span>
            </div>
          </div>
        </Link>
      </Tilt>
    </motion.div>
  );
}

export function ShapeFinder() {
  return (
    <section aria-labelledby="shape-finder-heading" className="bg-sand-100 py-14 lg:py-20">
      <Container>
        <SectionHeading
          id="shape-finder-heading"
          title={SHAPES.title.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
          blurb={SHAPES.blurb}
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:mt-20 lg:grid-cols-3 lg:gap-6">
          {SHAPES.items.map((shape, index) => (
            <ShapeCard key={shape.id} shape={shape} index={index} />
          ))}
        </div>

        {/* Escape hatch for anyone who does not want to choose a footprint first. */}
        <div className="mt-12 flex justify-center">
          <Link
            href="/custom-studio"
            className="group inline-flex items-center gap-2 rounded-full text-sm text-ink-500 transition-colors hover:text-clay-600"
          >
            Not sure which shape? Start in the Custom Studio
            <ArrowRight
              size={15}
              strokeWidth={1.7}
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </Link>
        </div>
      </Container>
    </section>
  );
}
