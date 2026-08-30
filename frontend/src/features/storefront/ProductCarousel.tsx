"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useCart } from "@/contexts/CartContext";
import { CarouselControls, Container, SectionHeading } from "@/features/storefront/primitives";
import { SHAPES, shapeOf } from "@/features/storefront/content";
import { catalogQueryOptions } from "@/lib/storefrontUi";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

const FEATURED = {
  title: ["Pieces people", "start with."],
  blurb:
    "The configurations chosen most often — a good first look at how the depths, the arms and the fabrics come together.",
} as const;

/** 110 pieces live in the catalogue; a carousel is a preview, not the shop. */
const FEATURED_LIMIT = 12;

const fallbackImage =
  "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=86";

/**
 * Card width tracks the "cards per view" breakpoints: 1.2 on mobile so the next
 * tile peeks and the row reads as scrollable, then 2 / 3 / 4 with the 1.25rem
 * gap subtracted so whole cards land flush against the gutters.
 */
const cardWidth = cn(
  "w-[80%] shrink-0 snap-start",
  "sm:w-[calc((100%-1.25rem)/2)]",
  "md:w-[calc((100%-2.5rem)/3)]",
  "lg:w-[calc((100%-3.75rem)/4)]"
);

const shapeBadge = cn(
  "inline-block rounded-full bg-clay-500/10 px-2 py-1",
  "text-[10px] font-semibold uppercase leading-none tracking-[0.16em] text-clay-500"
);

const SKELETON_KEYS = ["a", "b", "c", "d"];

/** Display name of the shape family a piece belongs to. */
function shapeLabel(name: string): string {
  const id = shapeOf(name);
  return SHAPES.items.find((item) => item.id === id)?.name ?? "Sectional";
}

export function ProductCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const { addToCart } = useCart();
  const { data: products = [], isLoading } = trpc.commerce.getProducts.useQuery(
    undefined,
    catalogQueryOptions
  );

  const featured = useMemo(() => products.slice(0, FEATURED_LIMIT), [products]);

  const syncScrollState = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const maxScroll = track.scrollWidth - track.clientWidth;
    setCanPrev(track.scrollLeft > 4);
    setCanNext(track.scrollLeft < maxScroll - 4);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    syncScrollState();
    track.addEventListener("scroll", syncScrollState, { passive: true });
    window.addEventListener("resize", syncScrollState);
    return () => {
      track.removeEventListener("scroll", syncScrollState);
      window.removeEventListener("resize", syncScrollState);
    };
  }, [syncScrollState, featured.length, isLoading]);

  const scrollByCard = useCallback((direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.firstElementChild as HTMLElement | null;
    // Fall back to a viewport-width nudge if the track has not painted a card yet.
    const step = card ? card.offsetWidth + 20 : track.clientWidth * 0.8;
    track.scrollBy({ left: step * direction, behavior: "smooth" });
  }, []);

  return (
    <section className="bg-sand-100 py-14 lg:py-20">
      <Container>
        <SectionHeading
          title={
            <>
              <span className="block">{FEATURED.title[0]}</span>
              <span className="block">{FEATURED.title[1]}</span>
            </>
          }
          blurb={FEATURED.blurb}
        />

        {!isLoading && featured.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-sand-300 px-6 py-16 text-center">
            <p className="font-display text-2xl text-ink-900">The workshop is restocking.</p>
            <p className="mt-2 text-sm text-ink-500">New pieces are being finished by hand.</p>
            <Link
              href="/shop"
              className="mt-6 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-clay-600 transition-colors hover:text-clay-700"
            >
              Browse the collection <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div
            ref={trackRef}
            className="scrollbar-none mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto overscroll-x-contain pb-2 [-webkit-overflow-scrolling:touch]"
          >
            {isLoading
              ? SKELETON_KEYS.map((key) => (
                  <div key={key} className={cn(cardWidth, "rounded-2xl border border-sand-200 bg-sand-50 p-3")}>
                    <div className="aspect-square animate-pulse rounded-xl bg-sand-200" />
                    <div className="px-1 pb-1 pt-4">
                      <div className="h-[1.125rem] w-24 animate-pulse rounded-full bg-sand-200" />
                      <div className="mt-2 h-5 w-2/3 animate-pulse rounded bg-sand-200" />
                      <div className="mt-1 h-5 w-1/3 animate-pulse rounded bg-sand-200" />
                    </div>
                  </div>
                ))
              : featured.map((product) => (
                  <Link
                    key={product.id}
                    href={`/product/${product.slug}`}
                    className={cn(
                      cardWidth,
                      "group relative rounded-2xl border border-sand-200 bg-sand-50 p-3",
                      "transition-all duration-300 hover:-translate-y-1 hover:ring-1 hover:ring-ink-900/15",
                      "hover:shadow-[0_20px_45px_-28px_rgba(31,27,23,0.45)]"
                    )}
                  >
                    {/* Catalogue shots are renders on a plain ground, so the piece is
                        fitted inside the well with padding rather than cropped to fill. */}
                    <div className="grid aspect-square place-items-center overflow-hidden rounded-xl bg-sand-100 p-4 sm:p-5">
                      <OptimizedImage
                        src={product.imageUrl || fallbackImage}
                        alt={product.name}
                        sizes="(min-width: 1024px) 24vw, (min-width: 768px) 32vw, (min-width: 640px) 48vw, 80vw"
                        className="h-full w-full object-contain transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                    </div>

                    <div className="px-1 pb-1 pr-12 pt-4">
                      <span className={shapeBadge}>{shapeLabel(product.name)}</span>
                      <h3 className="mt-2 truncate text-sm font-medium text-ink-900">{product.name}</h3>
                      <p className="mt-1 text-sm text-ink-500">
                        From ${(product.startingPrice / 100).toLocaleString()}
                      </p>
                    </div>

                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.94 }}
                      aria-label={`Add ${product.name} to bag`}
                      onClick={(event) => {
                        // The whole card is a Link, so keep the click on the button.
                        event.preventDefault();
                        event.stopPropagation();
                        addToCart({
                          id: `product-${product.id}`,
                          name: product.name,
                          price: product.startingPrice,
                          quantity: 1,
                          image: product.imageUrl || undefined,
                          variantDetails: "Standard configuration",
                        });
                      }}
                      className="absolute bottom-4 right-4 grid h-10 w-10 place-items-center rounded-full bg-clay-500 text-white transition-colors hover:bg-clay-600"
                    >
                      <ShoppingBag size={16} strokeWidth={1.7} />
                    </motion.button>
                  </Link>
                ))}
          </div>
        )}

        {featured.length > 0 || isLoading ? (
          <CarouselControls
            onPrev={() => scrollByCard(-1)}
            onNext={() => scrollByCard(1)}
            canPrev={canPrev}
            canNext={canNext}
            className="mt-10 justify-end"
          />
        ) : null}
      </Container>
    </section>
  );
}
