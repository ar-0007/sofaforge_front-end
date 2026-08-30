"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { OptimizedImage } from "@/components/OptimizedImage";
import { TransitionPanel } from "@/components/motion-primitives/transition-panel";
import { SERIES_COPY, SERIES_SECTION } from "@/features/storefront/content";
import {
  CarouselControls,
  Container,
  Eyebrow,
  SectionHeading,
} from "@/features/storefront/primitives";
import { catalogQueryOptions } from "@/lib/storefrontUi";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

const fallbackImage =
  "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=86";

const SKELETON_TAB_KEYS = ["a", "b", "c", "d", "e", "f", "g"];

const tabBase = cn(
  "shrink-0 snap-start rounded-full px-5 py-2.5 text-[11px] font-semibold uppercase",
  "tracking-[0.18em] transition-colors focus-visible:outline-none focus-visible:ring-2",
  "focus-visible:ring-clay-500 focus-visible:ring-offset-2 focus-visible:ring-offset-sand-100"
);

function tabClass(isActive: boolean) {
  return cn(
    tabBase,
    isActive
      ? "bg-ink-900 text-sand-50"
      : "border border-sand-300 text-ink-700 hover:border-clay-500 hover:text-clay-500"
  );
}

const panelVariants = {
  enter: { opacity: 0, y: 18 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -18 },
};

/** Copy is authored per series name; the DB description is the safety net. */
function copyForSeries(name: string, description: string | null) {
  const authored = SERIES_COPY[name];
  return {
    tagline: authored?.tagline ?? "",
    copy: authored?.copy ?? description ?? "",
  };
}

/**
 * "What will it look like?" — the visitor has a shape in mind and is now
 * comparing silhouettes, so the seven series sit side by side as tabs with one
 * large panel rather than a grid of equal-weight cards.
 */
export function SeriesShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const { data: seriesList = [], isLoading } = trpc.commerce.getSeries.useQuery(
    undefined,
    catalogQueryOptions
  );
  // Same query key the product carousel already uses on this page, so the piece
  // counts come out of the cache rather than costing another round trip.
  const { data: products = [] } = trpc.commerce.getProducts.useQuery(
    undefined,
    catalogQueryOptions
  );

  const pieceCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const product of products) {
      counts.set(product.seriesId, (counts.get(product.seriesId) ?? 0) + 1);
    }
    return counts;
  }, [products]);

  const step = useCallback(
    (delta: number) => {
      setActiveIndex((current) => {
        const total = seriesList.length;
        if (total === 0) return 0;
        return (current + delta + total) % total;
      });
    },
    [seriesList.length]
  );

  const focusTab = useCallback((index: number) => {
    setActiveIndex(index);
    tabRefs.current[index]?.focus();
  }, []);

  const onTabKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const total = seriesList.length;
    if (total === 0) return;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      focusTab((activeIndex + 1) % total);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      focusTab((activeIndex - 1 + total) % total);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusTab(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusTab(total - 1);
    }
  };

  const heading = (
    <SectionHeading
      id="series-showcase-heading"
      title={SERIES_SECTION.title.map((line) => (
        <span key={line} className="block">
          {line}
        </span>
      ))}
      blurb={SERIES_SECTION.blurb}
    />
  );

  if (isLoading) {
    return (
      <section className="bg-sand-100 py-14 lg:py-20" aria-busy="true">
        <Container>
          <Eyebrow>The series</Eyebrow>
          <div className="mt-5">{heading}</div>
          <div className="mt-12 flex gap-3 overflow-hidden">
            {SKELETON_TAB_KEYS.map((key) => (
              <div key={key} className="h-[42px] w-28 shrink-0 animate-pulse rounded-full bg-sand-200" />
            ))}
          </div>
          <div className="mt-10 grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="aspect-[4/3] animate-pulse rounded-2xl bg-sand-200" />
            <div className="space-y-4">
              <div className="h-3 w-32 animate-pulse rounded bg-sand-200" />
              <div className="h-12 w-2/3 animate-pulse rounded bg-sand-200" />
              <div className="h-4 w-full animate-pulse rounded bg-sand-200" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-sand-200" />
              <div className="h-12 w-44 animate-pulse rounded-full bg-sand-200" />
            </div>
          </div>
        </Container>
      </section>
    );
  }

  // Nothing to compare — show nothing rather than an empty shell.
  if (seriesList.length === 0) return null;

  const safeIndex = Math.min(activeIndex, seriesList.length - 1);
  const activeSeries = seriesList[safeIndex];

  return (
    <section className="bg-sand-100 py-14 lg:py-20" aria-labelledby="series-showcase-heading">
      <Container>
        <Eyebrow>The series</Eyebrow>
        <div className="mt-5">{heading}</div>

        <div className="mt-12 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <div
            role="tablist"
            aria-label="Sofa series"
            onKeyDown={onTabKeyDown}
            className="scrollbar-none -mx-6 flex snap-x snap-mandatory items-center gap-3 overflow-x-auto overscroll-x-contain px-6 pb-1 sm:mx-0 sm:px-0 [-webkit-overflow-scrolling:touch]"
          >
            {seriesList.map((series, index) => {
              const isActive = index === safeIndex;
              return (
                <button
                  key={series.id}
                  ref={(node) => {
                    tabRefs.current[index] = node;
                  }}
                  type="button"
                  role="tab"
                  id={`series-tab-${series.id}`}
                  aria-selected={isActive}
                  aria-controls="series-showcase-panel"
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActiveIndex(index)}
                  className={tabClass(isActive)}
                >
                  {series.name}
                </button>
              );
            })}
          </div>

          <CarouselControls
            className="shrink-0"
            onPrev={() => step(-1)}
            onNext={() => step(1)}
            canPrev
            canNext
          />
        </div>

        {/* TransitionPanel only forwards motion props, so the tab semantics
            live on this wrapper. */}
        <div
          id="series-showcase-panel"
          role="tabpanel"
          aria-labelledby={`series-tab-${activeSeries.id}`}
          className="mt-10 lg:mt-14"
        >
          <TransitionPanel
            activeIndex={safeIndex}
            variants={panelVariants}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {seriesList.map((series) => {
              const { tagline, copy } = copyForSeries(series.name, series.description);
              const count = pieceCounts.get(series.id) ?? 0;
              return (
                <div
                  key={series.id}
                  className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16"
                >
                  <div className="overflow-hidden rounded-2xl bg-sand-200">
                    <div className="aspect-[4/3] p-3 sm:p-5">
                      <OptimizedImage
                        src={series.imageUrl || fallbackImage}
                        alt={series.name}
                        sizes="(min-width: 1024px) 46vw, 92vw"
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </div>

                  <div>
                    {tagline ? (
                      <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-clay-500">
                        {tagline}
                      </p>
                    ) : null}
                    <h3 className="font-display mt-4 text-4xl leading-[1.05] tracking-[-0.03em] text-ink-900 sm:text-5xl">
                      {series.name}
                    </h3>
                    {copy ? (
                      <p className="mt-5 max-w-md text-sm leading-7 text-ink-500 sm:text-base">
                        {copy}
                      </p>
                    ) : null}
                    {count > 0 ? (
                      <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
                        {count} {count === 1 ? "piece" : "pieces"} in this series
                      </p>
                    ) : null}
                    <Link
                      href={`/shop?series=${series.slug}`}
                      className="mt-8 inline-flex items-center rounded-full bg-clay-500 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-clay-600"
                    >
                      Explore {series.name}
                    </Link>
                  </div>
                </div>
              );
            })}
          </TransitionPanel>
        </div>
      </Container>
    </section>
  );
}
